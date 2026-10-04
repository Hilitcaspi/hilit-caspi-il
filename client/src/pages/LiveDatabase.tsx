import { DatabaseSalesContent } from "./DatabaseSales";

/** Same trusted database product page, with the LIVE gift separated from the core offer. */
export default function LiveDatabase() {
  return <DatabaseSalesContent campaign="live" />;
}
