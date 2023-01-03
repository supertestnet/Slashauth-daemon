import { format } from '@synonymdev/slashtags-url'

import { Base } from './base.js'
import { AuthZResponse, MagicLinkResponse } from './messages.js'

export class SlashtagsAuthServer extends Base {
  /**
   * @param {Slashtag} slashtag
   * @param {{onauthz?: OnAuthz, onmagiclink?: OnMagicLink}} [opts]
   */
  constructor (slashtag, opts) {
    super(slashtag)
    this.onauthz = opts?.onauthz || noauthz
    this.onmagiclink = opts?.onmagiclink || nomagiclink
  }

  get methods () {
    const self = this
    return [
      {
        name: 'authz',
        options: { responseEncoding: AuthZResponse },
        handler: self.authz.bind(self)
      },
      {
        name: 'magiclink',
        options: { responseEncoding: MagicLinkResponse },
        handler: self.magiclink.bind(self)
      }
    ]
  }

  async authz (req, socket) {
    return this.onauthz(req, socket.remotePublicKey)
  }

  async magiclink (_, socket) {
    return this.onmagiclink(socket.remotePublicKey)
  }

  /**
   * Format a `slashauth:<z-base32 this.slashtag.id>?q=token` URL.
   * @param {string} token
   */
  formatURL (token) {
    return format(this.slashtag.key, { query: { q: token }, protocol: 'slashauth:' })
  }
}

export default SlashtagsAuthServer

function nomagiclink () {
  throw new Error('Magic link not implemented')
}
function noauthz () {
  throw new Error('Authz not implemented')
}

/**
 * @typedef {import('./messages').IAuthZResponse} IAuthZResponse
 * @typedef {import('./messages').IMagicLinkResponse} IMagicLinkResponse
 * @typedef {(token: string, remotePublicKey: Uint8Array) => IAuthZResponse | Promise<IAuthZResponse>} OnAuthz
 * @typedef {(remotePublicKey: Uint8Array) => IMagicLinkResponse | Promise<IMagicLinkResponse>} OnMagicLink
 * @typedef {import('@synonymdev/slashtag').Slashtag} Slashtag
 */
