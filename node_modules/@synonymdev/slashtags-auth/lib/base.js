import c from 'compact-encoding'
import RPC from '@synonymdev/slashtags-rpc'

export const RPC_ID = 'slashtags-auth:alpha'

export class Base extends RPC {
  get id () {
    return RPC_ID
  }

  get valueEncoding () {
    return c.string
  }
}
