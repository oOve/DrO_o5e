/*
▓█████▄  ██▀███           ▒█████  
▒██▀ ██▌▓██ ▒ ██▒        ▒██▒  ██▒
░██   █▌▓██ ░▄█ ▒        ▒██░  ██▒
░▓█▄   ▌▒██▀▀█▄          ▒██   ██░
░▒████▓ ░██▓ ▒██▒ ██▓    ░ ████▓▒░
 ▒▒▓  ▒ ░ ▒▓ ░▒▓░ ▒▓▒    ░ ▒░▒░▒░ 
 ░ ▒  ▒   ░▒ ░ ▒░ ░▒       ░ ▒ ▒░ 
 ░ ░  ░   ░░   ░  ░      ░ ░ ░ ▒  
   ░       ░       ░         ░ ░  
 ░                 ░              
 Macro by Dr.O_o
 https://github.com/oOve/sundries
 */

// An Active Effect Template for invisibility based on Umbral Sight
let InvisEffect = {
  "label": "Umbral Sight Invisible",
  "icon": "icons/svg/invisible.svg",
  "flags": {
      "core": {
          "statusId": "invisible"
      }
  },
  "disabled": false,
  "origin": null,
  "tint": null,
  "transfer": false
};

function dmod(n) {
  return ((n % 360) + 360) % 360;
}

function isTokenInDarkness(token){
  // Is global light turned on?
  if (canvas.scene.globalLight) return false;  
  // Token position
  let tpos = token.center;
  // An array to keep lights from tokens and AmbientLights
  let lights = [];

  // Add token lights
  let tokens_with_light = canvas.tokens.placeables.filter( t=>t.light.active );
  lights = tokens_with_light.map(t=>{return{
      x:t.light.x, 
      y:t.light.y, 
      fov:t.light.data.angle, 
      rot:t.light.data.rotation, 
      dim:t.light.data.dim}
  });

  // Filter lights on or off
  let valid_lights = canvas.lighting.placeables.filter(l=>l.emitsLight);
  lights = lights.concat(valid_lights.map(l=>{return {
      x:l.center.x, 
      y:l.center.y, 
      fov:l.document.config.angle, 
      rot:l.document.rotation, 
      dim:l.dimRadius}
  }));

  // Filter lights by Range
  lights = lights.filter(l=>{ return ((l.x-tpos.x)**2 + (l.y-tpos.y)**2) < (l.dim**2); });
  // Filter by light angle
  lights = lights.filter(l=>{
    if (l.fov==360) return true;
    let r = new Ray(l, tpos );
    let a = Math.PI/2-r.angle;
    let lr = Math.toRadians(dmod(-l.rot));
    let l2 = Math.toRadians(l.fov/2);    
    let dff = Math.atan2(Math.sin(a-lr), Math.cos(a-lr));    
    return Math.abs(dff)<l2;
  });



  // Iterate through the lights until we find one without collision  
  for (let l of lights){ 
    if (!(canvas.walls.checkCollision(new Ray(tpos, l), {'type':'light','mode':'any'}))){ 
      // We found one light in range and in angle range and without walls blocking us
      return false;
    }
  };

  // None of the lights shine on me
  return true;
}


// Update this GloomStalker
async function updateOneStalker(token) {
  // 1. We are a gloom stalker  
  // 2. Get our invis active effect (if it exists)
  let usi = Array.from(token.actor.effects).filter(e=>e.label==InvisEffect.label)[0];
    
  // 3. Are we in darkness?
  let should_invis = isTokenInDarkness( ('object' in token)?token.object:token );  

  // 4. Create effect if it doesn't exist
  if (usi === undefined){
    InvisEffect.disabled = !should_invis;
      token.actor.createEmbeddedDocuments("ActiveEffect", [InvisEffect]);
  } else if(usi.disabled == should_invis) {
    await usi.update({'disabled':!should_invis});
    (('object' in token)?token.object:token).refresh();
  }
}


function updateGloomStalkers(){  
  if(!game.user.isGM) return;
  let gloomstalkers = canvas.tokens.placeables.filter(isGloomy);
  gloomstalkers.forEach(updateOneStalker);
}

function isGloomy(token){
return token.actor.classes.ranger?.system?.subclass == "Gloom Stalker" ||
       token.actor.classes.ranger?.subclass?.name == "Gloom Stalker";
} 

function onUpdateLight(light, change, options, user_id){
  updateGloomStalkers();
}

function onUpdateToken(token, change, options, user_id){
  //console.log(change);
  //console.log(token);
  if (('x' in change) || ('y' in change) || ('rotation' in change) ){
    if(token.light.dim>0){
      updateGloomStalkers();
    }
  }  
  // Do we own this token?
  if (! token.isOwner ) return;
  // Is this a gloomstalker?
  if (isGloomy(token)){
    updateOneStalker(token);    
  }  
}


// Settings:
Hooks.once("init", () => {
  Hooks.on("updateToken", onUpdateToken);
  Hooks.on("updateAmbientLight", onUpdateLight );
});
