import { prepareBoostNewsletterCampaign } from "./server/boostNewsletterCampaign";

async function main() {
  const result = await prepareBoostNewsletterCampaign({
    "0700": "XVf9w4Y58spTtoenbFdzce",
    "0800": "AuzoejmBAQRVph6eKDe6FC",
    "0900": "V3KoWUnbgs8JfMUQEECQsf",
  });
  console.log(JSON.stringify({ prepared: result.prepared, counts: result.counts }));
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "prepare_failed");
  process.exit(1);
});
