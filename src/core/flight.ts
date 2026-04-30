const FLIGHT_PUSH_PATTERN =
  /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)<\/script>/g;

export function extractFlightPushPayloads(html: string): string[] {
  const payloads: string[] = [];

  for (const match of html.matchAll(FLIGHT_PUSH_PATTERN)) {
    payloads.push(JSON.parse(`"${match[1]}"`) as string);
  }

  return payloads;
}
