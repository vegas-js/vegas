# GAS Reference

> Fixtures are observations of GAS runtime behavior, not manually authored expected values.

- reference/cases  
  Characterization code to be run on a GAS production system

- reference/fixtures  
  Committed references acquired from and normalized by a GAS production system

- tools/reference  
  Acquisition, normalization, and comparison tools

## Updating fixtures

Set the following environment variables:

- `GAS_REFERENCE_SCRIPT_ID`
- `GAS_REFERENCE_DEPLOYMENT_ID`
- `GAS_REFERENCE_OAUTH_CLIENT_ID`
- `GAS_REFERENCE_OAUTH_CLIENT_SECRET`
- `GAS_REFERENCE_REFRESH_TOKEN`

Then run:

```bash
# Monitor actual GAS and update the committed fixture
$ pnpm reference:update

# Just measure the actual GAS and compare it to the committed fixture
# About exit codes:
#   0  match
#   1  harness/API/auth failure
#   2  reference drift
$ pnpm reference:verify
```

The command:

1. uploads the committed reference source to the dedicated GAS reference project,
2. executes the reference case against GAS,
3. normalizes the observed result,
4. updates the committed fixture.

OAuth credentials and refresh tokens must never be committed.
