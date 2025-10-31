-- Insert admin role for jasper@retailtwin.com
INSERT INTO user_roles (user_id, role)
VALUES ('c47a8f5e-9a39-40c9-9db2-6d7451ebb1ff', 'admin')
ON CONFLICT DO NOTHING;