// Pruebas del asistente Zorro ARVI: node scripts/bot-tests.cjs
// Falla (exit 1) si alguna pregunta del set principal o de las conversaciones no se responde como se espera.
const fs = require('fs'), vm = require('vm'), path = require('path');
const mod = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/arvi-bot.js'), 'utf8'), { module: mod, console });
const B = mod.exports;
let FAILED = 0;
const _log = console.log;
console.log = (...a) => { const t = a.join(' '); const m = t.match(/^(Preguntas sueltas|Set \d[^:]*|Conversaciones)[^\n]*?(\d+)\/(\d+)/); _log(...a); };
{

// [pregunta, intención esperada (prefijo)]
const T = [
 // precios / cotización
 ['cuanto cuesta arrendar juegos','precio'],['precios?','precio'],['cuanto sale arrendar un juego','precio'],['me pueden mandar los valores','precio'],['quiero cotizar','precio|como_cotizar'],
 ['como cotizo','como_cotizar'],['que datos necesitan para cotizar','como_cotizar'],['tienen lista de precios','precio'],['cuanto cobran por un evento','precio'],['es muy caro?','precio'],
 ['cuanto vale la tagada','ride:tagada:precio'],['precio del barco pirata','ride:barco:precio'],['cuanto cuesta el toro mecanico','ride:toro:precio'],['valor inflables','ride:inflables:precio'],
 // incluye / montaje / regiones
 ['que incluye el arriendo','incluye'],['incluye operador?','incluye'],['ustedes llevan los juegos?','incluye|regiones'],['el traslado esta incluido','incluye'],['quien opera los juegos','incluye'],
 ['cuanto se demoran en armar','montaje'],['cuanto demora el montaje','montaje'],['a que hora llegan a instalar','montaje'],
 ['llegan a regiones?','regiones'],['hacen eventos en concepcion','regiones'],['van a temuco','regiones'],['trabajan en antofagasta?','regiones'],['llegan a punta arenas','regiones'],['hacen eventos fuera de santiago','regiones'],
 ['tienen disponibilidad para el 18 de septiembre','anticipacion'],['con cuanta anticipacion debo reservar','anticipacion'],['necesito juegos para mañana','anticipacion'],
 ['formas de pago','pago'],['hacen factura?','pago'],['aceptan tarjeta','pago'],['trabajan con orden de compra','pago|b2b'],
 ['y si llueve?','clima'],['se puede instalar en un gimnasio','clima'],
 // técnico
 ['que electricidad necesitan los juegos','electricidad'],['necesitan luz?','electricidad'],['tienen generador','ride:generadores|electricidad'],['necesito trifasica?','electricidad'],
 ['cuanto espacio necesito','espacio'],['tengo un patio chico que juegos caben','espacio'],['se puede instalar en pasto','espacio'],
 // catálogo
 ['que juegos tienen','juegos'],['catalogo de juegos','juegos|descargas'],['que atracciones arriendan','juegos'],['juegos mecanicos','juegos'],
 ['juegos para niños pequeños','rec_peques'],['que tienen para preescolares','rec_peques'],['juegos para un jardin infantil','rec_peques|b2b'],['algo para guaguas','rec_peques'],
 ['juegos para adultos','rec_grandes'],['algo con adrenalina para jovenes','rec_grandes'],['para una fiesta de empresa','rec_grandes|b2b'],
 ['evento masivo con mucha gente','rec_masivo'],['juegos para una fonda','rec_masivo'],['para fiestas patrias','rec_masivo|b2b'],
 ['juegos que no necesiten electricidad','rec_sinluz'],['no tenemos luz en el lugar','rec_sinluz|electricidad'],
 ['tienen juegos de agua','rec_verano'],['juegos acuaticos','rec_verano|ride:acuaticos'],
 ['tienen alguna promocion','complementarios'],['hay descuento','complementarios'],
 // juegos específicos
 ['tagada','ride:tagada'],['la tagadá','ride:tagada'],['tagaba','ride:tagada'],['barco pirata','ride:barco'],['montaña rusa dragon','ride:dragon'],['el dragon','ride:dragon'],
 ['montaña rusa','ambig'],['carrusel','ambig'],['tren','ambig'],['rueda','ambig'],['sillitas','ambig'],['muro','ambig'],
 ['carrusel inclusivo','ride:carrusel_inc'],['carrusel a pedales','ride:carrusel_sus'],['carrusel de caballitos','ride:carrusel'],
 ['cine 9d','ride:cine'],['tienen simulador','ride:cine'],['toro mecanico','ride:toro'],['cama elastica','ride:bungy'],['tiene camas elasticas?','ride:bungy'],
 ['castillo inflable','ride:inflables'],['inflables','ride:inflables'],['tirolesa','ride:canopy'],['canopy','ride:canopy'],['go kart','ride:gokart'],['autitos a pedales','ride:gokart'],
 ['pesca milagrosa','ride:feria'],['juegos de feria','ride:feria'],['martillo de fuerza','ride:martillo'],['muro de escalada','ride:muro_eco'],['escalada inflable','ride:muro_inf'],
 ['gladiadores','ride:gladiadores'],['reloj derribador','ride:reloj'],['aviones','ride:aviones'],['lanchitas','ride:lanchitas'],['giroscopio','ride:giroscopio'],['noria','ride:noria'],
 ['alfombra magica','ride:alfombra'],['globos samba','ride:globos'],['trencito','ride:tren'],['tren a riel','ride:tren_riel'],['zona de circo','ride:circo'],['piscina inflable','ride:piscinas'],
 ['cuantas personas suben al barco','ride:barco:cap'],['cuanto mide la tagada','ride:tagada:med'],['la montaña rusa dragon necesita trifasica?','ride:dragon:en'],
 ['estatura minima para la tagada','ride:tagada:est'],['desde que edad pueden subir al barco','ride:barco:est'],['cuanto demora en armarse el carrusel inclusivo','ride:carrusel_inc:mon'],
 ['el tren de fantasia necesita electricidad','ride:tren:en'],['cuantos niños por turno en los inflables','ride:inflables:cap'],
 // empresa / seguridad / b2b
 ['son seguros los juegos?','seguridad'],['tienen certificacion sec','seguridad'],['tienen seguro','seguridad'],['cuentan con permisos','seguridad'],
 ['quienes son','empresa'],['cuantos años de experiencia tienen','empresa'],['fabrican sus juegos?','empresa'],
 ['donde han hecho eventos','eventos'],['tienen referencias','empresa|eventos'],['opiniones de clientes','eventos'],
 ['trabajan con municipalidades','b2b'],['postulan a licitaciones','b2b'],['estan en mercado publico','b2b'],['soy de un colegio','b2b'],['somos una productora','b2b'],['para el dia del niño','b2b'],['evento de navidad en la empresa','b2b'],
 ['venden juegos?','venta'],['quiero comprar un juego','venta'],['quiero trabajar con ustedes','trabajo'],['buscan operadores?','trabajo'],
 // sustentable / inclusivo / seguro
 ['que son los juegos sustentables','sustentable'],['juegos ecologicos','sustentable'],['como funcionan los juegos a pedales','sustentable'],['que es el sistema dresina','sustentable'],
 ['municipio verde en tu escuela','proyectos_muni'],['ecodiversion infantil','proyectos_muni'],['proyectos para municipios','proyectos_muni'],
 ['tienen juegos inclusivos','inclusivo'],['juegos para niños en silla de ruedas','inclusivo|ride:carrusel_inc'],['accesibilidad','inclusivo'],
 ['que es arvi seguro','seguro'],['espacios para niños con autismo','seguro'],['niños con nee','seguro'],
 // verano
 ['van a estar en algarrobo','verano'],['cuando abren en papudo','verano'],['cuanto cuesta el boleto en algarrobo','verano'],['verano 2027','verano'],['donde van a estar este verano','verano'],['parque arvi papudo','verano'],
 // happy
 ['que es arvi happy','happy'],['quiero celebrar el cumpleaños de mi hijo','happy'],['salon de cumpleaños','happy'],
 ['cuanto cuesta un cumpleaños en arvi happy','h_precio'],['precio del salon','h_precio'],['valor cumpleaños fin de semana','h_precio'],
 ['que incluye el salon de cumpleaños','h_incluye'],['tiene piscina de pelotas el salon','h_incluye'],['cuantas personas caben en el salon','h_capacidad'],
 ['para que edad es el salon','h_edad'],['puedo celebrar un cumpleaños de 12 años en arvi happy','h_edad'],['donde queda arvi happy','h_donde'],['direccion del salon de cumpleaños','h_donde'],
 ['como reservo el salon','h_reserva'],['cuanto es la garantia del salon','h_reserva|h_precio'],['cumpleaños formas de pago','h_reserva'],
 ['puedo cancelar el cumpleaños','h_cancela'],['reagendar mi cumpleaños','h_cancela'],['horarios del salon de cumpleaños','h_horario'],['cuantas horas dura el cumpleaños','h_horario'],
 ['puedo llevar comida al cumpleaños','h_comida'],['se puede llevar carrito de completos al salon','h_comida'],['puedo decorar el salon','h_deco'],['se puede tomar alcohol en el cumpleaños','h_reglas'],
 ['tiene cocina el salon','h_cocina'],['hay mudador en el salon','h_cocina'],['hay monitoras en el cumpleaños','h_monitor'],['convenio funcionarios municipales','convenio'],['soy funcionaria municipal hay descuento','convenio'],
 ['telefono de arvi happy','h_contacto'],
 // contacto / redes / descargas
 ['cual es su telefono','contacto'],['horario de atencion','contacto'],['donde estan ubicados','contacto'],['correo','contacto'],['tienen instagram','redes'],['descargar catalogo pdf','descargas'],
 // conversación
 ['hola','saludo'],['buenas tardes','saludo'],['gracias','gracias'],['chao','chao'],['eres un bot?','quien'],['quiero hablar con una persona','humano'],['hola cuanto cuesta arrendar juegos','precio'],
 ['tienen estacionamiento para camiones?','fallback|espacio'],['venden helados?','fallback|venta'],
 // errores de tipeo
 ['cuanto questa','precio'],['inflabes','ride:inflables'],['cumpleanios','happy'],['sustentabls','sustentable'],['montage','montaje'],['regiones? llegan a valdivia?','regiones'],
];
let ok = 0, bad = [];
for (const [q, exp] of T) {
  const d = B.respond(q, {}).debug.intent || '';
  const pass = exp.split('|').some(e => d === e || d.startsWith(e + ':') || (e === 'ambig' && d.startsWith('ambig')) || (e.startsWith('ride:') && d.startsWith(e)));
  if (pass) ok++; else bad.push(`  ✗ "${q}" → ${d}   (esperado ${exp})`);
}
// conversaciones con contexto
const S = [
  [['que es arvi happy', 'happy'], ['y cuanto cuesta?', 'h_precio'], ['que incluye', 'h_incluye'], ['se puede llevar alcohol', 'h_reglas'], ['y donde queda', 'h_donde'], ['llegan a regiones?', 'regiones'], ['cuanto cuesta', 'precio']],
  [['tagada', 'ride:tagada'], ['cuanto mide', 'ride:tagada:med'], ['y necesita electricidad?', 'ride:tagada:en'], ['cuantas personas suben', 'ride:tagada:cap'], ['y el barco pirata?', 'ride:barco'], ['estatura minima', 'ride:barco:est']],
  [['hola', 'saludo'], ['van a estar en algarrobo?', 'verano'], ['cuanto cuestan los boletos', 'verano|precio']],
  [['quiero celebrar un cumpleaños', 'happy'], ['cuantas personas caben', 'h_capacidad'], ['y si son mas de 20 niños', 'h_ninos'], ['como reservo', 'h_reserva'], ['puedo cancelar', 'h_cancela']],
];
let cok = 0, cn = 0;
for (const conv of S) {
  let st = {};
  for (const [q, exp] of conv) {
    cn++;
    const r = B.respond(q, st); const d = r.debug.intent || '';
    if ('ctx' in r) st.ctx = r.ctx; if ('ride' in r) st.ride = r.ride;
    const pass = exp.split('|').some(e => d === e || d.startsWith(e + ':') || d.startsWith(e));
    if (pass) cok++; else bad.push(`  ✗ [conv] "${q}" → ${d}   (esperado ${exp})`);
  }
}
console.log(`Preguntas sueltas: ${ok}/${T.length} · Conversaciones: ${cok}/${cn}`); if (ok < T.length || cok < cn) FAILED++;
console.log(bad.join('\n'));

}
{

const T = [
 ['Hola buenas, quería saber cuánto sale arrendar unos juegos para un evento de mi empresa','precio'],
 ['necesito presupuesto para un aniversario de la comuna','precio|b2b'],
 ['ustedes ponen a la gente que cuida los juegos?','incluye'],
 ['se demoran mucho en instalar?','montaje'],
 ['hacen eventos en la serena?','regiones'],['llegan hasta chiloe','regiones'],['estoy en rancagua, van para alla?','regiones'],
 ['quedan fechas para diciembre?','anticipacion'],['puedo pagar con transferencia el arriendo','pago'],
 ['que pasa si hay viento','clima'],['necesito juegos bajo techo','clima'],
 ['que conexion electrica requieren','electricidad'],['el lugar no tiene enchufe trifasico','electricidad'],
 ['mi patio mide 10x10 que puedo poner','espacio'],['se puede instalar en cesped','espacio'],
 ['me mandan el catalogo','descargas|juegos'],['que juegos hay para niños de 3 años','rec_peques'],['tienen algo para adolescentes','rec_grandes'],
 ['para una fiesta costumbrista que me recomiendan','rec_masivo'],['juegos para la fonda del colegio','rec_masivo|b2b'],
 ['tienen el toro?','ride:toro'],['el barquito pirata cuanto mide','ride:barco:med'],['cuantos caben en la tagada','ride:tagada:cap'],
 ['la rueda chicago cuanta energia necesita','ride:rueda:en'],['montaña rusa del dragon edad minima','ride:dragon:est'],
 ['los inflables necesitan luz?','ride:inflables:en'],['cuanto demora en instalarse el canopy','ride:canopy:mon'],
 ['el cine 9d para que edades es','ride:cine:est'],['cuantos niños caben en los aviones','ride:aviones:cap'],
 ['tienen gokart para niños','ride:gokart'],['arriendan castillos inflables?','ride:inflables'],['tienen tirolina?','ride:canopy'],
 ['tienen juegos de feria con premios?','ride:feria'],['el muro de escalada es seguro?','ride:muro_eco'],
 ['que tan seguros son sus juegos','seguridad'],['estan certificados?','seguridad'],
 ['hace cuanto existen','empresa'],['son una empresa chilena?','empresa'],
 ['trabajan con el municipio de maipu?','b2b'],['somos un colegio y queremos juegos para el dia del niño','b2b'],['es para el aniversario de la empresa','b2b'],
 ['hacen juegos a pedido?','venta'],['me interesa invertir','venta'],['estoy buscando trabajo','trabajo'],
 ['los juegos funcionan sin luz?','rec_sinluz|electricidad'],['que juegos son ecologicos','sustentable'],['como es eso de los juegos a manivela','sustentable'],
 ['tienen algo para niños en silla de ruedas','inclusivo|ride:carrusel_inc'],['mi hijo tiene tea, tienen algo','seguro'],
 ['cuando empiezan en algarrobo','verano'],['cuanto vale la ficha en papudo','verano'],['van a estar en la playa este verano?','verano'],
 ['quiero hacer el cumple de mi hija','happy'],['cuanto cobran por el cumpleaños un sabado','h_precio'],['el salon tiene juegos?','h_incluye'],
 ['cuantos invitados puedo llevar al salon','h_capacidad'],['mi hijo cumple 11 puede ser en arvi happy','h_edad'],['como llego a arvi happy','h_donde'],
 ['cuanto hay que abonar para reservar el salon','h_reserva'],['si cancelo el cumpleaños me devuelven la plata','h_cancela'],['a que hora puedo llegar a decorar el salon','h_horario|h_deco'],
 ['puedo llevar torta al cumpleaños','h_comida'],['se puede llevar parlante al salon','h_reglas'],['puedo llevar a mi perro al cumpleaños','h_reglas'],
 ['el salon tiene refrigerador','h_cocina'],['cuantos baños tiene el salon','h_cocina'],['soy funcionario municipal','convenio'],
 ['cual es el whatsapp','contacto'],['a que hora atienden','contacto'],['tienen tiktok','redes'],
 ['gracias por la info','gracias'],['ok','fallback|gracias'],['quiero hablar con alguien','humano'],['no me sirve tu respuesta','humano'],
 ['asdfgh','fallback'],['tienen pinturas caritas','fallback'],
];
let ok=0, bad=[];
for (const [q,exp] of T){const d=B.respond(q,{}).debug.intent||''; const pass=exp.split('|').some(e=>d===e||d.startsWith(e+':')||(e.startsWith('ride:')&&d.startsWith(e))); if(pass)ok++; else bad.push(`  ✗ "${q}" → ${d}   (esperado ${exp})`);}
console.log(`Set 2 (frases nuevas): ${ok}/${T.length}`); console.log(bad.join('\n'));

}
{

const T = [
 ['wena, cuanto sale la wea de la tagada pa un evento en puente alto','ride:tagada:precio'],
 ['necesito 3 juegos para el aniversario del colegio, cuanto saldria','precio|b2b'],
 ['hola!! quiero arrendar juegos para navidad','como_cotizar|b2b|precio'],
 ['tienen montana rusa para niños chicos?','ambig'],
 ['que me recomiendan para niños de 5 años','rec_peques'],
 ['que juego atiende mas gente','rec_masivo'],
 ['cual es el juego mas grande','espacio|juegos'],
 
 ['el tagada es para niños?','ride:tagada:est'],
 ['los adultos se pueden subir al barco?','ride:barco:est'],
 ['cuanto mide el espacio que necesita la montaña rusa dragon','ride:dragon:med'],
 ['que necesito para instalar la rueda','ambig'],['cual es el juego mas popular','rec_top'],
 ['el carrusel inclusivo cuantas sillas de ruedas admite','ride:carrusel_inc:cap'],
 ['me interesa el toro mecanico y los inflables','ride:toro|ride:inflables'],
 ['tienen generador por si no hay luz?','ride:generadores|electricidad|rec_sinluz'],
 ['cuanto tiempo antes llegan a montar','montaje'],
 ['hasta que hora pueden funcionar los juegos','fallback|contacto|incluye'],
 ['llevan sus propios operadores o tengo que poner gente','incluye'],
 ['se hacen cargo si un niño se accidenta?','seguridad'],
 ['tienen seguro de responsabilidad civil','seguridad'],
 ['emiten factura exenta?','pago'],
 ['estan inscritos en chileproveedores','b2b'],
 ['quiero contratar el cumpleaños en el salon para el 15 de diciembre','happy|h_reserva'],
 ['el salon esta en santiago?','h_donde'],
 ['tienen estacionamiento en el salon','h_donde'],
 ['cuantos niños entran en el valor','h_ninos|h_precio|precio'],
 ['cuanto sale cada niño extra','h_ninos'],
 ['puedo llevar mi propia decoracion de globos','h_deco'],
 ['puedo llevar un animador al cumpleaños','h_monitor'],
 ['puedo llevar inflable propio al salon','h_reglas'],
 ['el salon tiene wifi','fallback|h_incluye|happy'],
 ['el cumpleaños se puede hacer un martes en la tarde?','h_horario|h_precio'],
 ['el convenio es para cualquier municipalidad?','convenio'],
 ['arvi seguro donde funciona','seguro'],
 ['que dia abren en algarrobo','verano'],
 ['el boleto de 2000 es por juego?','verano'],
 ['hola tienen whatsapp?','contacto'],
 ['me pueden llamar?','contacto|humano'],
 ['quiero hablar con un ejecutivo','humano'],
];
let ok=0, bad=[];
for (const [q,exp] of T){const r=B.respond(q,{});const d=r.debug.intent||''; const pass=exp.split('|').some(e=>d===e||d.startsWith(e+':')||d.startsWith(e)); if(pass)ok++; else bad.push(`  ✗ "${q}" → ${d}   (esperado ${exp})`);}
console.log(`Set 3 (mensajes reales): ${ok}/${T.length}`); console.log(bad.join('\n'));

}
if (FAILED) { console.error('Hay respuestas del set principal que no coinciden.'); process.exit(1); }
