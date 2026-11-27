/**
 * The all-station MRT layer is the normal published map.
 * ?mrtNetwork=0 permits the v0.1 rail label comparison.
 * ?mrtPilot=1 permits the 5-station v0.2 comparison unless network=1 is explicit.
 */
export const isMrtNetworkEnabled = (search: string): boolean => {
  const params = new URLSearchParams(search)
  const network = params.get('mrtNetwork')
  if (network === '0') return false
  if (network === '1') return true
  return params.get('mrtPilot') !== '1'
}
