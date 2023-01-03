import http from 'http';
import url from 'url';
import { fastify } from 'fastify';
import fs from 'fs'
import b4a from 'b4a'
import SDK, { SlashURL } from '@synonymdev/slashtags-sdk';
import { Server } from '@synonymdev/slashtags-auth';

/** START OF SERVER SETUP **/

if ( !fs.existsSync( "db.txt" ) ) {
  var db = {};
  var texttowrite = JSON.stringify( db );
  fs.writeFileSync( "db.txt", texttowrite, function() {return;});
}

if ( !fs.existsSync( "profile.txt" ) ) {
  var profile = {};
  profile[ "name" ] = "";
  profile[ "bio" ] = "";
  profile[ "image" ] = "";
  var texttowrite = JSON.stringify( profile );
  fs.writeFileSync( "profile.txt", texttowrite, function() {return;});
}

var ready = false;

function waitSomeSeconds( num ) {
  var num = num.toString() + "000";
  num = Number( num );
  return new Promise( function( resolve, reject ) {
    setTimeout( function() { resolve( "" ); }, num );
  });
}

async function waiter() {
  //this waiter function waits til the "await slashtag.listen();" line starts listening for messages sent to me via
  //my slashtag, then connects to bitkit's seeder and any other nodes that announce themselves on the topic below
  var i; for ( i=0; i<10000; i++ ) {
    if ( ready ) {
      sdk.swarm.join( Buffer.from( "3b9f8ccd062ca9fc0b7dd407b4cd287ca6e2d8b32f046d7958fa7bea4d78fd75", "hex" ) );
      break;
    }
    await waitSomeSeconds( 1 );
  }
}
waiter();

function isValidUser(_) { return true }

function validateToken( token, user ) {
  //check my db.txt file to see if the client id the user passed in is awaiting authentication
  var dbtext = fs.readFileSync( "db.txt" ).toString();
  var db = JSON.parse( dbtext );
  if ( token in db ) return true;
  return;
}

function isValidJson( content ) {
  if ( !content ) return;
  try {  
    var json = JSON.parse( content );
  } catch ( e ) {
    return;
  }
  return true;
}

function encodeAsBase32( buf ) {
    var ALPHABET = "ybndrfg8ejkmcpqxot1uwisza345h769".split("");
    const max = buf.byteLength * 8;
    let s = "";
    for(let p = 0; p < max; p += 5){
        const i = p >> 3;
        const j = p & 7;
        if (j <= 3) {
            s += ALPHABET[buf[i] >> 3 - j & 31];
            continue;
        }
        const of = j - 3;
        const h = buf[i] << of & 31;
        const l = (i >= buf.length ? 0 : buf[i + 1]) >> 8 - of;
        s += ALPHABET[h | l];
    }
    return s;
}

function decodeFromBase32( string ) {
  var base32tohex = (function() {
      var dec2hex = function(s) {
          return (s < 15.5 ? "0" : "") + Math.round(s).toString(16)
      }
        , hex2dec = function(s) {
          return parseInt(s, 16)
      }
        , base32tohex = function(base32) {
          for (var base32chars = "ybndrfg8ejkmcpqxot1uwisza345h769".toUpperCase(), bits = "", hex = "", i = 0; i < base32.length; i++) {
              var val = base32chars.indexOf(base32.charAt(i).toUpperCase());
              bits += leftpad(val.toString(2), 5, "0")
          }
          for (i = 0; i + 4 <= bits.length; i += 4) {
              var chunk = bits.substr(i, 4);
              hex += parseInt(chunk, 2).toString(16)
          }
          return hex
      }
        , leftpad = function(str, len, pad) {
          return len + 1 >= str.length && (str = new Array(len + 1 - str.length).join(pad) + str),
          str
      };
      return base32tohex;
  }
  )();
  var hex = base32tohex( string );
  var arr = Buffer.from ( hex, "hex" );
  return arr;
}

var sendResponse = ( response, data, statusCode, content_type ) => {
  response.setHeader( 'Access-Control-Allow-Origin', '*' );
  response.setHeader( 'Access-Control-Request-Method', '*' );
  response.setHeader( 'Access-Control-Allow-Methods', 'OPTIONS, GET' );
  response.setHeader( 'Access-Control-Allow-Headers', '*' );
  response.setHeader( 'Content-Type', content_type[ "Content-Type" ] );
  response.writeHead( statusCode );
  response.end( data );
};

var collectData = ( request, callback ) => {
  var data = '';
  request.on( 'data', ( chunk ) => {
    data += chunk;
  });
  request.on( 'end', () => {
    callback( data );
  });
};

const requestListener = function( request, response ) {
  var parts = url.parse( request.url, true );
  var gets = parts.query;
  //my php app should pass in a client id as a GET parameter
  var clientid = "";
  if ( gets.clientid ) {
    clientid = gets.clientid;
  }
  if ( request.method === 'GET' ) {
    if ( parts.path == "/" || parts.path.startsWith( "/?" ) ) {
      //if it did, assume their authentication status is false, indicating "not authenticated"
      var name = JSON.parse( Buffer.from( existing_profile ).toString() )[ "name" ];
      //clear old db entries
      var dbtext = fs.readFileSync( "db.txt" ).toString();
      var db = JSON.parse( dbtext );
      var now = Math.floor( Date.now() / 1000 );
      Object.keys( db ).forEach( function( entry ) {
        if ( db[ entry ][ "timestamp" ] + 300 < now ) delete db[ entry ];
      });
      var texttowrite = JSON.stringify( db );
      fs.writeFileSync( "db.txt", texttowrite, function() {return;});    
      if ( clientid ) {
        var authenticated = false;
        //check if they are authenticated (if this happened, it happened when the onauthz function of the slashtags server fired)
        if ( clientid in db ) {
          //if the user's client id is an object, they authenticated properly and the value of db[ clientid ] will contain their slashtag,
          //so set their auth status to that object; otherwise, they did not authenticate properly, so leave their auth status as false
          if ( typeof( db[ clientid ][ "authenticated" ] ) == "object" ) {
            authenticated = JSON.stringify( db[ clientid ][ "authenticated" ] );
          }
        } else {
          //if the user's clientid was not in my authentication db, put it in there with an authentication status of false
          //because this means they are trying to authenticate
          var obj = {}
          obj[ "authenticated" ] = false;
          obj[ "timestamp" ] = Math.floor( Date.now() / 1000 );
          db[ clientid ] = obj;
          var texttowrite = JSON.stringify( db );
          fs.writeFileSync( "db.txt", texttowrite, function() {return;});
        }
        if ( !authenticated ) {
          //if the user did not authenticate yet but they are in the db, pass them the slash-auth url so they can authenticate
          sendResponse( response, "slash-auth:" + slashtag.url.substring( slashtag.url.indexOf( ":" ) + 1 ) + '?q=' + clientid, 200, {'Content-Type': 'text/plain'} );
        } else {
          //if the user did authenticate properly, pass the authenticated user's profile object (including their slashtag) so my php app can use it
          //to find their account or create it. I used to clear the authenticated user from the db here but later I decided against it because if the
          //server gets the user's slashtag and deletes the entry and then somehow crashes before serving the slashtag to the user, it should be able
          //to get the entry again after a reboot
          sendResponse( response, authenticated, 200, {'Content-Type': 'text/plain'} );
        }
      } else {
        //if my php app did not pass in a clientid, remind it to
        sendResponse( response,
          name + '\n' +
          'Send a client id: ?clientid=abababababaa',
          200, {'Content-Type': 'text/plain'} );
      }
    }
    if ( parts.path.startsWith( "/status" ) ) {
      var status = {}
      status[ "daemon_running" ] = true;
      status[ "connected_to_dht_network" ] = ready;
      status = JSON.stringify( status );
      sendResponse( response,
          status,
          200, {'Content-Type': 'text/plain'} );
    }
  } else if ( request.method === 'POST' ) {
    if ( parts.path == "/profile" ) {
      collectData(request, async ( formattedData ) => {
        var old_profile_text = fs.readFileSync( "profile.txt" ).toString();
        if ( old_profile_text == formattedData ) {
          sendResponse( response, 'No change', 200, {'Content-Type': 'text/plain'} );
          return;
        }
        var new_profile = JSON.parse( formattedData );
        var texttowrite = JSON.stringify( new_profile );
        fs.writeFileSync( "profile.txt", texttowrite, function() {return;});
        var profile_is_set = await setSlashtagProfile( new_profile );
        profile_is_set = JSON.stringify( profile_is_set );
        sendResponse( response, profile_is_set, 200, {'Content-Type': 'text/plain'} );
      });
    }
  }
}

const httpserver = http.createServer( requestListener );
httpserver.listen( 10249 );

async function areWeReady() {
  return new Promise( function( resolve, reject ) {
    if ( !ready ) {
      setTimeout( async function() {
        var msg = await areWeReady();
        resolve( msg );
      }, 50 );
    } else {
      resolve( ready );
    }
  });
}

async function setSlashtagProfile( profile ) {
  var inner_ready = await areWeReady();
  if ( !inner_ready ) return;
  var publicDrive = slashtag.drivestore.get()
  await publicDrive.ready()
  await publicDrive.put( '/profile.json', b4a.from( JSON.stringify( profile ) ) );
  return profile;
}

/** END OF SERVER SETUP **/

/** START SLASHTAGS AUTH SETUP **/

let saved 
try { saved = fs.readFileSync( './storage/primaryKey' ) } catch {}

const sdk = new SDK({ storage: './storage', primaryKey: saved })

if ( !saved ) fs.writeFileSync( './storage/primaryKey', sdk.primaryKey )

// Get the default slashtag
const slashtag = sdk.slashtag()

// Set profile if not already saved
var local_profile_text = fs.readFileSync( "profile.txt" ).toString();
var local_profile = JSON.parse( local_profile_text );
var local_name = local_profile[ "name" ];
var local_bio = local_profile[ "bio" ];
var local_image = local_profile[ "image" ];
if ( !local_name || !local_image ) {
  var profile_to_set = {
    name: 'Almost there!',
    image:
      "data:image/svg+xml,%3Csvg viewBox='0 0 140 140' id='svg-slashtags' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M59.469 48.981h13.074l-11.29 41.947H48.18l11.29-41.947zm32.352 0l-11.29 41.947H67.456l11.29-41.947h13.075z' fill='%23fff'%3E%3C/path%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M75.578 17.299c29.14 3.079 50.202 29.184 47.123 58.279-3.079 29.14-29.184 50.202-58.279 47.123-29.14-3.079-50.202-29.184-47.123-58.279 3.079-29.14 29.184-50.202 58.279-47.123zm-1.16 11.067C51.526 25.91 30.775 42.69 28.366 65.582c-2.455 22.892 14.324 43.643 37.216 46.052 22.892 2.455 43.643-14.324 46.052-37.216 2.455-22.892-14.324-43.643-37.216-46.052z' fill='red'%3E%3C/path%3E%3C/svg%3E",
    bio: 'This service is not yet set up properly, the admin must still create a new name, profile picture, and bio. Go here: [admin url]',
  }
} else {
  var profile_to_set = {
    name: local_name,
    image: local_image,
    bio: local_bio,
  }
}
var publicDrive = slashtag.drivestore.get()
await publicDrive.ready()
var existing_profile = await publicDrive.get( '/profile.json' );
if (
  !existing_profile ||
  !isValidJson( Buffer.from( existing_profile ).toString() ) ||
  !( "name" in JSON.parse( Buffer.from( existing_profile ).toString() ) ) ||
  !( "bio" in JSON.parse( Buffer.from( existing_profile ).toString() ) ) ||
  !( "image" in JSON.parse( Buffer.from( existing_profile ).toString() ) ) ||
  JSON.parse( Buffer.from( existing_profile ).toString() )[ "name" ] != local_name ||
  JSON.parse( Buffer.from( existing_profile ).toString() )[ "bio" ] != local_bio ||
  JSON.parse( Buffer.from( existing_profile ).toString() )[ "image" ] != local_image
) await publicDrive.put( '/profile.json', b4a.from( JSON.stringify( profile_to_set ) ) );
console.log( "my profile:", JSON.parse( Buffer.from( existing_profile ).toString() ) );

const server = new Server( slashtag, {
  //the variable called token contains the user's clientid
  //the variable called remote contains the user's slashtag (without the prefix) encoded in some funky way that I don't yet understand
  onauthz: async ( token, remote ) => {
    if ( !isValidUser( remote ) ) return { status: "error", message: "sign up first!" }

    const url = SlashURL.format(remote)

    // Check that token is valid, and remote isn't blocked
    const valid = validateToken( token, url )
    if ( valid ) {
      //if everything checks out, log the user's slashtag to indicate that they are logged in
      var drive = sdk.drive(remote);
      var profile = await drive.get("/profile.json");
      if ( isValidJson( profile ) ) {
        var profile_object = JSON.parse( Buffer.from( profile ).toString() );
      } else {
        var profile_object = {}
        profile_object[ "name" ] = url.substring( url.indexOf( "slash:" ) + 6, 38 );
        profile_object[ "bio" ] = "";
        profile_object[ "image" ] = "";
        profile_object[ "links" ] = [];
      }
      profile_object[ "slashtag" ] = url;
      var dbtext = fs.readFileSync( "db.txt" ).toString();
      var db = JSON.parse( dbtext );
      var obj = {}
      obj[ "authenticated" ] = profile_object;
      obj[ "timestamp" ] = Math.floor( Date.now() / 1000 ) + 300;
      db[ token ] = obj;
      var texttowrite = JSON.stringify( db );
      fs.writeFileSync( "db.txt", texttowrite, function() {return;});
      return { status: "ok" }
    }
    return {status: "error", message: "invalid token"}
  }
});

// Listen on server's Slashtag key through DHT connections
await slashtag.listen();
ready = true;

/** END OF SLASHTAGS AUTH SETUP **/
