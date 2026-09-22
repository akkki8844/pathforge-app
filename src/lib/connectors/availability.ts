/**
 * Which third-party connectors are open to users right now.
 *
 * A connector has more than one way in: the card in Settings → Connectors, and
 * whatever button imports from it elsewhere in the app (GitHub also has one on
 * Outcomes). Parking an integration in only the first place leaves the second
 * one live, and it then fails in a way that reads as a bug rather than as "not
 * yet" — so the state lives here and every entry point reads it.
 *
 * Turning one back on is deleting a line, not rebuilding a feature: the OAuth
 * flows, token tables, edge functions and import code are all still in place
 * and still tested.
 */
export const CONNECTOR_AVAILABILITY = {
  linkedin: true,
  google: true,
  composio: true,
  github: false,
} as const;

export type ConnectorId = keyof typeof CONNECTOR_AVAILABILITY;

export function isConnectorAvailable(id: ConnectorId): boolean {
  return CONNECTOR_AVAILABILITY[id];
}
