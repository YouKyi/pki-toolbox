#!/bin/sh
# Generates the CRL, PKCS#7 and PKCS#12 fixtures used by the v2 decoders.
# Run inside an Alpine container that has openssl:
#   docker run --rm -v "$PWD:/w" -w /w alpine sh -c "apk add -q openssl && sh scripts/generate-v2-fixtures.sh"
# The printed blocks are pasted into src/lib/samples.ts.
set -e
cd "$(mktemp -d)"

mkdir -p demoCA/newcerts
: > demoCA/index.txt
echo 1000 > demoCA/serial
echo 1000 > demoCA/crlnumber

cat > ca.cnf <<'EOF'
[ca]
default_ca = CA_default
[CA_default]
dir = .
database = $dir/demoCA/index.txt
new_certs_dir = $dir/demoCA/newcerts
serial = $dir/demoCA/serial
crlnumber = $dir/demoCA/crlnumber
default_md = sha256
default_days = 3650
default_crl_days = 3650
policy = policy_anything
copy_extensions = none
[policy_anything]
countryName = optional
organizationName = optional
commonName = supplied
[req]
distinguished_name = req_dn
[req_dn]
EOF

# Root CA (EC P-256), 20-year validity
openssl ecparam -name prime256v1 -genkey -noout -out ca.key
openssl req -x509 -new -key ca.key -sha256 -days 7300 \
	-subj "/C=FR/O=pki-toolbox/CN=pki-toolbox Test CA" -out ca.crt

# Leaf certificate issued through the CA database (so it can be revoked)
openssl ecparam -name prime256v1 -genkey -noout -out leaf.key
openssl req -new -key leaf.key -subj "/C=FR/O=pki-toolbox/CN=demo.pki-toolbox.test" -out leaf.csr
openssl ca -batch -config ca.cnf -keyfile ca.key -cert ca.crt -in leaf.csr -out leaf.crt

# Revoke the leaf and generate a CRL
openssl ca -batch -config ca.cnf -keyfile ca.key -cert ca.crt \
	-revoke leaf.crt -crl_reason keyCompromise
openssl ca -batch -config ca.cnf -keyfile ca.key -cert ca.crt -gencrl -out crl.pem

# PKCS#7 certs-only bundle (CA + leaf)
openssl crl2pkcs7 -nocrl -certfile leaf.crt -certfile ca.crt -out bundle.p7b

# PKCS#12 bundle (leaf key + leaf cert + CA), password "changeit"
openssl pkcs12 -export -inkey leaf.key -in leaf.crt -certfile ca.crt \
	-name "demo.pki-toolbox.test" -passout pass:changeit -out bundle.p12

echo "// ===== CRL ====="
cat crl.pem
echo "// ===== PKCS7 ====="
cat bundle.p7b
echo "// ===== PKCS12 (base64, password: changeit) ====="
openssl base64 -in bundle.p12
