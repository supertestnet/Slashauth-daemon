# slashtags-auth

P2P authorization and bidirectional authentication with holepunching through Hyperswarm.

## Installation

```bash
npm install @synonymdev/slashtags-auth
```

## Usage

### Server side

```js
import SDK from '@synonymdev/slashtags-sdk'
import { Server } from '@synonymdev/slashtags-auth'

const sdk = new SDK({ primaryKey: <32 bytes secret key> })

const slashtag = sdk.slashtag()

const server = new Server(slashtag, {
    onauthz: (token, remote) => {
        // Check that token is valid, and remote isn't blocked
        return true
    },
    onmagiclink: (remote) => {
        return 'https://www.example.com?q=foobar'
    }
})

const slashauthURL = server.fromatURL(token)
```

### Client side

```js
import SDK from '@synonymdev/slashtags-sdk'
import { Client } from '@synonymdev/slashtags-auth'

const sdk = new SDK({ primaryKey: <32 bytes secret key> })

const slashtag = sdk.slashtag()

const client = new Client(slashtag)

// Authorize an app by scanning a slashauth: url
const response = client.authz(url)
// true or false

// Request a magicLink from the server's slashtag url
const link =  client.magiclik(url)
```

## API

TODO
