These are PUBLIC, synthetic test-only TLS fixtures, valid until November 2036.
`server-key.pem` is deliberately committed for an in-process, loopback-only fake
PostgreSQL server. Never use these keys/certificates or trust this CA outside tests.
`server.pem` is valid for localhost; `wrong-host.pem` is signed by the same CA but
valid only for wrong-host.invalid. Tests must accept the former with an explicit
test CA and reject both an untrusted CA and a trusted but mismatched hostname.
