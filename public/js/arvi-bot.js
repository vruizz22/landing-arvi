/*!
 * Zorro ARVI · asistente de preguntas frecuentes de arvi.cl
 * Sin servidor ni IA externa: base de conocimiento + motor de coincidencias con
 * tolerancia a errores, contexto de conversación y fichas por juego.
 * Para editar respuestas: busca el id en INTENTS o el juego en RIDES.
 */
(function (root) {
  'use strict';

  /* ======================= DATOS DE CONTACTO ======================= */
  var WA_NUM = '56988082320';
  var WA_HAPPY = '56962031726';
  var C = {
    wa: '+569 8808 2320', tel2: '+569 6203 1726', fijo: '+56 22 527 1281',
    mail: 'info@arvi.cl', mail2: 'arvi.juegos@gmail.com', mailHappy: 'salon.arvihappy@gmail.com', waHappy: '+56 9 6203 1726',
    horario: 'lunes a viernes de 9:30 a 18:30, y sábado y domingo de 9:30 a 16:00',
    happyDir: 'Abate Molina 866, El Bosque'
  };
  var PDF = {
    muni: '/descargas/arvi-sustentable-convenio-municipalidades.pdf',
    happy: '/descargas/arvi-happy-informacion.pdf',
    conv: '/descargas/arvi-happy-convenio-funcionarios-municipales.pdf',
    seguro: '/descargas/arvi-seguro-propuesta.pdf'
  };

  /* ======================= JUEGOS (catálogo 2026) ======================= */
  // cat: mec (mecánico), sus (sustentable), inc (inclusivo), comp (complementario), acu (acuático)
  // elec: true si necesita electricidad para funcionar
  var RIDES = [
    { id: 'dragon', n: 'Montaña Rusa Dragón', cat: 'mec', a: ['montana rusa dragon', 'dragon', 'montana rusa del dragon', 'montana rusa mecanica'], g: ['montana rusa'],
      d: 'La primera dosis de velocidad, con toda la familia mirando.', cap: '6 pasajeros por turno de 5 minutos', fl: 432, mon: '3 horas', med: '20 m x 11 m', acc: '4,5 x 4,5 x 4,5 m (remolque)', en: 'Trifásica 5x32A, 20 amperes', est: 'Estatura mínima 1,20 m', pub: 'Niños y familias', elec: true },
    { id: 'tagada', n: 'Tagadá', cat: 'mec', a: ['tagada samba', 'tagada', 'tagadá', 'tagaba', 'tagda'],
      d: 'Giros y saltos que hacen vibrar a todos. ¡El de la fila más larga!', cap: '25 personas por turno de 5 minutos', fl: 1800, mon: '45 minutos', med: '8 m x 9,5 m', acc: '4,5 x 4,5 x 4,5 m (remolque)', en: 'Trifásica 5x32A, 20 amperes', est: 'Estatura mínima 1,30 m', pub: 'Jóvenes y adultos', elec: true },
    { id: 'rueda', n: 'Rueda Chicago', cat: 'mec', a: ['rueda chicago', 'rueda de chicago', 'rueda panoramica', 'rueda mecanica', 'vuelta al mundo'], g: ['rueda'],
      d: 'Vistas panorámicas en una atracción icónica.', cap: '18 personas por turno (3 por canasto)', fl: 1296, mon: '2 horas', med: '5 m x 10 m', acc: '4 x 4 x 4 m (remolque)', en: 'Trifásica 5x32A, 10 amperes', est: 'Juego familiar', pub: 'Familias', elec: true },
    { id: 'barco', n: 'Barco Pirata', cat: 'mec', a: ['barco pirata', 'barco', 'barquito', 'pirata'],
      d: 'La atracción estrella que garantiza diversión para todos.', cap: '16 personas por turno de 5 minutos', fl: 1152, mon: '45 minutos', med: '10 m de largo x 5 m de ancho', acc: '4 x 4 x 4 m (remolque)', en: 'Trifásica 5x32A, 12 amperes', est: 'Estatura mínima 90 cm (acompañado de un adulto)', pub: 'Todas las edades', elec: true },
    { id: 'alfombra', n: 'Alfombra Mágica', cat: 'mec', a: ['alfombra magica', 'alfombra', 'tobogan con sacos', 'tobogan gigante', 'resbalin gigante'],
      d: 'Juego familiar de tobogán con sacos.', cap: '4 personas por turno de 5 minutos', fl: 1153, mon: '2 horas', med: '9 m de alto x 13 m de fondo x 6 m de ancho', acc: '4 x 4 x 4 m (remolque largo)', en: 'Monofásica 16A solo para montaje y desmontaje; funciona 100% manual, sin electricidad', est: 'Juego familiar', pub: 'Familias', elec: false },
    { id: 'globos', n: 'Globos Samba', cat: 'mec', a: ['globos samba', 'globos', 'globo samba', 'globitos'],
      d: 'Emoción en cada vuelta para los más pequeños.', cap: '3 personas por canasta, turnos de 5 minutos', fl: 1300, mon: '2 horas', med: '10 m de diámetro', acc: '4 x 4 x 4 m (remolque)', en: 'Trifásica 5x32A, 10 amperes', est: 'Juego familiar', pub: 'Niños y familias', elec: true },
    { id: 'sillitas', n: 'Sillitas Voladoras', cat: 'mec', a: ['sillitas voladoras mecanicas', 'sillas voladoras', 'sillitas voladoras', 'silla voladora'], g: ['sillitas'],
      d: 'Las clásicas sillas giratorias.', cap: '8 personas por turno de 5 minutos', fl: 400, mon: '2 horas', med: '10 m de diámetro', acc: '4 x 4 x 4 m (remolque)', en: 'Trifásica 5x32A, 10 amperes', est: 'Juego familiar', pub: 'Familias', elec: true },
    { id: 'carrusel', n: 'Carrusel Mecánico', cat: 'mec', a: ['carrusel mecanico', 'carrusel de caballos', 'carrusel de caballitos', 'calesita', 'caballitos', 'carrusel clasico'], g: ['carrusel', 'carrousel', 'carrucel'],
      d: 'El carrusel clásico de caballitos.', cap: '10 personas por turno de 5 minutos', fl: 720, mon: '1 hora', med: '9 m de diámetro', acc: '4 x 4 x 4 m (remolque)', en: 'Monofásica 16A', est: 'Juego familiar', pub: 'Niños y familias', elec: true },
    { id: 'carrusel_inc', n: 'Carrusel Inclusivo', cat: 'inc', a: ['carrusel inclusivo', 'carrusel accesible', 'carrusel para silla de ruedas'], g: ['carrusel', 'carrousel', 'carrucel'],
      d: 'Para que más personas puedan subirse y girar juntas: rampa de acceso a la plataforma, espacio y cinturón de seguridad para silla de ruedas junto a las figuras, señalética inclusiva y un operador acompañando.', cap: '1 pasajero en silla de ruedas por turno de 5 minutos, junto a los demás pasajeros', fl: 720, mon: '1 hora', med: '9 m de diámetro', acc: '4 x 4 x 4 m (remolque)', en: 'Monofásica 16A', est: 'Para todas las edades y capacidades', pub: 'Todos', elec: true },
    { id: 'cine', n: 'Cine 9D', cat: 'mec', a: ['cine 9d', 'cine', 'simulador', 'cine 5d', 'cine 7d', 'realidad virtual', '9d'],
      d: 'Una experiencia inmersiva.', cap: '9 pasajeros por turno de 5 minutos', fl: 648, mon: '1 hora', med: '7 m x 4 m x 4 m', acc: '4 x 4 x 4 m (remolque)', en: 'Monofásica 16A', est: 'Experiencia inmersiva', pub: 'Niños, jóvenes y adultos', elec: true },
    { id: 'tren', n: 'Tren de Fantasía', cat: 'mec', a: ['tren de fantasia', 'trencito', 'tren de la alegria', 'tren movil', 'tren que recorre'], g: ['tren'],
      d: 'Un tren móvil que recorre plazas, parques y recintos con los niños a bordo. Una locomotora y un carro de pasajeros, con chofer con licencia profesional incluido, documentación y seguros al día.', cap: '35 pasajeros por turno', fl: null, mon: 'según el recorrido (es móvil)', med: 'Locomotora + 1 carro de pasajeros', acc: 'Necesita un recorrido amplio y transitable', en: 'Motor a bencina, no requiere electricidad', est: 'Barras en ventanas, extintor, frenos y luces', pub: 'Niños y familias', elec: false },
    { id: 'bungy', n: 'Bungy Trampolín', cat: 'mec', a: ['bungy trampolin', 'bungy', 'bungee', 'bungie', 'cama elastica con arnes', 'trampolin', 'camas elasticas', 'cama elastica'],
      d: 'Juego de alto flujo 4 en 1 con arneses y camas elásticas. Incluye 2 operadores.', cap: '4 pasajeros por turno de 5 minutos', fl: 300, mon: '1 hora 30 minutos', med: '10 m de diámetro', acc: '3 x 3 m (camión)', en: 'Monofásica 16A', est: 'Estructura autosoportada con vientos de acero', pub: 'Niños y jóvenes', elec: true },
    { id: 'feria', n: 'Stand Feria Americana', cat: 'comp', a: ['feria americana', 'stand feria', 'stands de feria', 'tiro al blanco', 'pesca milagrosa', 'tiro a los patos', 'tiro a la rana', 'mini golf', 'mini bowling', 'tiro a las botellas', 'juegos de feria'],
      d: 'Módulos de juegos de feria sin premios: tiro a los patos, tiro a la rana, pesca milagrosa, mini bowling, mini golf, tiro a las botellas y tiro a los gatos. Incluye 1 operador por módulo.', cap: 'Hasta 6 módulos lineales', fl: null, mon: '90 minutos', med: '3 m x 3 m por módulo', acc: 'Fácil acceso', en: 'No requiere electricidad', est: 'Para todas las edades', pub: 'Todas las edades', elec: false },
    { id: 'reloj', n: 'Reloj Derribador', cat: 'mec', a: ['reloj derribador', 'reloj', 'derribador', 'barredora'],
      d: 'Juego de habilidad: hay que saltar el brazo giratorio. Incluye 1 operador.', cap: '2 pasajeros por turno de 5 minutos', fl: 350, mon: '45 minutos', med: '6 m de diámetro', acc: '3 x 3 m (camión)', en: 'Monofásica 16A', est: 'Estatura entre 90 cm y 1,40 m', pub: 'Niños', elec: true },
    { id: 'canopy', n: 'Canopy Tirolesa', cat: 'mec', a: ['canopy', 'tirolesa', 'tiroleza', 'tirolina', 'canopi'],
      d: 'Juego deportivo de deslizamiento entre dos torres. Requiere anclajes y espacio amplio; ideal para eventos grandes y colegios. Incluye 4 operadores.', cap: '1 persona por lanzamiento', fl: 80, mon: '3 horas (requiere anclajes)', med: '6 m de alto x 80 m de extensión (2 torres)', acc: '4 x 4 x 4 m (remolque)', en: 'Monofásica 10A', est: 'Consulta requisitos de peso y estatura con el equipo', pub: 'Niños, jóvenes y adultos', elec: true },
    { id: 'aviones', n: 'Aviones Voladores', cat: 'mec', a: ['aviones voladores', 'aviones', 'avioncitos', 'avion'],
      d: 'Juego infantil de aviones giratorios. Incluye 1 operador.', cap: '8 niños por turno (2 por avión)', fl: 600, mon: '2 horas', med: '5 m de diámetro', acc: '4 x 4 x 4 m (remolque)', en: 'Monofásica 16A', est: 'Solo niños, estatura máxima 1,20 m', pub: 'Niños pequeños', elec: true },
    { id: 'tren_riel', n: 'Tren a Riel', cat: 'mec', a: ['tren a riel', 'tren con rieles', 'tren sobre rieles', 'trencito a riel', 'tren de rieles'], g: ['tren'],
      d: 'Tren sobre rieles con locomotora, para los más pequeños. Incluye 1 operador.', cap: '10 pasajeros por turno de 5 minutos', fl: 720, mon: '1 hora', med: '6 m de largo x 4 m de ancho', acc: 'Carro remolque', en: 'Monofásica 16A', est: 'Juego preescolar, estatura máxima 1,20 m', pub: 'Preescolares', elec: true },
    { id: 'gokart', n: 'Pista Go Kart', cat: 'mec', a: ['go kart', 'gokart', 'karts', 'kart', 'autitos a pedales', 'autos a pedales', 'pista de autos', 'carritos a pedales'],
      d: 'Circuito inflable con 4 autos a pedales, solo para niños. Requiere superficie plana y espacio amplio. Incluye 1 operador.', cap: '4 niños por turno (1 por auto)', fl: 360, mon: '1 hora', med: '10 m x 20 m', acc: 'Requiere espacio amplio', en: 'Monofásica 16A, solo para el inflado', est: 'Solo niños', pub: 'Niños', elec: true },
    { id: 'martillo', n: 'Martillo Mecánico', cat: 'mec', a: ['martillo mecanico', 'martillo de fuerza', 'martillo', 'medidor de fuerza', 'golpe de fuerza'],
      d: 'Juego manual de fuerza, liviano y fácil de instalar. Ideal para complementar eventos. El operador es opcional.', cap: '1 persona por turno', fl: null, mon: '40 minutos', med: '2 m x 3 m (150 kg)', acc: 'Fácil acceso', en: 'No requiere electricidad', est: 'Jóvenes y adultos', pub: 'Jóvenes y adultos', elec: false },
    { id: 'muro_inf', n: 'Muro Inflable', cat: 'mec', a: ['muro inflable', 'muro de escalada inflable', 'escalada inflable'], g: ['muro', 'escalada'],
      d: 'Pista de escalada inflable solo para niños, con arnés y retención por operador (1 operador por pista).', cap: '1 persona por turno de 5 minutos', fl: 1300, mon: '1 hora', med: '4,5 m x 5 m x 6,5 m', acc: 'Fácil acceso', en: 'Monofásica 16A', est: 'Solo niños', pub: 'Niños', elec: true },
    { id: 'gladiadores', n: 'Gladiadores', cat: 'mec', a: ['gladiadores', 'gladiador', 'pelea con bastones', 'duelo inflable'],
      d: 'Juego inflable de enfrentamiento para 2 jugadores con bastones de espuma. Incluye extintor y pendón de seguridad.', cap: '2 personas por turno de 5 minutos', fl: 144, mon: '1 hora', med: '4 m x 4 m', acc: 'Fácil acceso', en: 'Monofásica 16A + turbina', est: 'Niños, jóvenes y adultos', pub: 'Jóvenes y adultos', elec: true },
    { id: 'inflables', n: 'Inflables', cat: 'mec', a: ['inflables', 'inflable', 'castillo inflable', 'castillos inflables', 'saltarin', 'brincolin', 'juegos inflables'],
      d: 'Inflables para niños; se pueden combinar varios módulos según el espacio. Incluye extintor y pendón de seguridad.', cap: '5 personas por turno de 5 minutos', fl: 360, mon: '1 hora', med: '4 m x 4 m por unidad', acc: 'Fácil acceso', en: 'Monofásica 16A + turbina', est: 'Para niños, estatura máxima 1,40 m', pub: 'Niños', elec: true },
    { id: 'toro', n: 'Toro Mecánico', cat: 'mec', a: ['toro mecanico', 'toro', 'rodeo', 'simulador de rodeo'],
      d: 'Simulador de rodeo con colchón inflable y operador permanente. Incluye extintor y pendón de seguridad.', cap: '1 pasajero por turno de 5 minutos', fl: 80, mon: '1 hora', med: '6 m de diámetro', acc: 'Fácil acceso', en: 'Monofásica 16A + turbina', est: 'Jóvenes y adultos', pub: 'Jóvenes y adultos', elec: true },
    { id: 'circo', n: 'Zona de Circo', cat: 'comp', a: ['zona de circo', 'circo', 'carnaval', 'zona carnaval'],
      d: 'Zona de descanso e interacción estilo circo-carnaval con juegos de feria sin premios: mini bowling, pesca milagrosa, tiro a los patos, tiro a la rana, rayuela, mini golf, tiro a las botellas y tiro a los gatos. Incluye 1 operador por módulo.', cap: 'Hasta 6 módulos lineales', fl: null, mon: '90 minutos', med: '3 m x 3 m por módulo', acc: 'Fácil acceso', en: 'No requiere electricidad', est: 'Para todas las edades', pub: 'Familias', elec: false },
    { id: 'acuaticos', n: 'Juegos Acuáticos', cat: 'acu', a: ['juegos acuaticos inflables', 'inflables acuaticos', 'tobogan de agua', 'toboganes de agua', 'castillo acuatico'],
      d: 'Inflables acuáticos: toboganes, piscinas y castillos. Incluye operador, extintor y control sanitario completo (limpieza, cloración y control de pH). Ideal para eventos de verano.', cap: 'Sin límite (varios juegos simultáneos)', fl: null, mon: '2 horas', med: '150 m² aproximadamente', acc: 'Espacio amplio', en: 'Monofásica, solo para montaje y desmontaje', est: 'Estatura mínima 90 cm', pub: 'Familiar e infantil', elec: false },
    { id: 'piscinas', n: 'Piscinas Recreativas', cat: 'acu', a: ['piscinas recreativas', 'piscina recreativa', 'piscina inflable', 'piscinas'], g: ['piscina'],
      d: 'Piscina inflable recreativa. Incluye extintor, pendón de seguridad y 1 operador. Ideal para días calurosos.', cap: '15 personas por piscina', fl: 900, mon: '1 hora', med: '6 m de diámetro', acc: 'Fácil acceso', en: 'Monofásica 16A + turbina', est: 'Niños y familias', pub: 'Niños y familias', elec: true },
    { id: 'lanchitas', n: 'Lanchitas a Manivela', cat: 'acu', a: ['lanchitas', 'lanchas', 'botes', 'botecitos', 'lanchitas a manivela'],
      d: 'Pista de agua con lanchas a manivela para niños pequeños. Incluye 1 operador.', cap: '4 niños por turno de 5 minutos', fl: 288, mon: '1 hora', med: '6 m de largo x 4 m de ancho', acc: 'Fácil acceso', en: 'Monofásica 16A + turbina', est: 'Preescolar, estatura máxima 1,20 m', pub: 'Preescolares', elec: true },
    { id: 'giroscopio', n: 'Giroscopio Manual', cat: 'sus', a: ['giroscopio', 'giroscopo', 'giro 360', 'girosfera'],
      d: 'Juego rotatorio de equilibrio, 100% manual. Incluye 1 operador y vallas perimetrales.', cap: '1 pasajero por turno de 5 minutos', fl: 72, mon: '1 hora', med: '3,5 m de diámetro', acc: 'Fácil acceso', en: 'No requiere electricidad (100% manual)', est: 'Niños, jóvenes y adultos', pub: 'Niños, jóvenes y adultos', elec: false },
    { id: 'sillitas_sus', n: 'Sillitas Voladoras Sustentables', cat: 'sus', a: ['sillitas voladoras sustentables', 'sillitas sustentables', 'sillitas ecologicas', 'sillitas eco', 'sillitas a manivela', 'sillitas de animales marinos', 'animales marinos'], g: ['sillitas'],
      d: 'Sillitas de animales marinos en peligro por contaminación, movidas con energía humana (manivela, asistencia compartida). No requieren electricidad. Incluye 1 operador.', cap: '8 pasajeros por turno de 5 minutos', fl: 360, mon: '1 hora', med: '9 m de diámetro, con reja perimetral', acc: 'Remolque modular', en: '100% cinética, generada por los usuarios. No requiere electricidad', est: 'Solo niños hasta 10 años', pub: 'Niños hasta 10 años', elec: false },
    { id: 'carrusel_sus', n: 'Carrusel Sustentable', cat: 'sus', a: ['carrusel sustentable', 'carrusel ecologico', 'carrusel eco', 'carrusel a pedales', 'carrusel con bicicletas', 'animales en peligro'], g: ['carrusel', 'carrousel', 'carrucel'],
      d: 'Carrusel de animales en peligro de extinción de Chile, movido a pedales con bicicletas. No requiere electricidad. Incluye 1 operador.', cap: '5 pasajeros por turno de 5 minutos', fl: 360, mon: '1 hora', med: '9 m de diámetro, con reja perimetral', acc: 'Remolque modular', en: '100% cinética, generada por el pedaleo. No requiere electricidad', est: 'Niños y adultos', pub: 'Niños y adultos', elec: false },
    { id: 'muro_eco', n: 'Muro ECO', cat: 'sus', a: ['muro eco', 'muro de escalada', 'pared de escalada', 'escalada fija', 'muro escalada'], g: ['muro', 'escalada'],
      d: 'Muro de escalada fijo con sistema de seguridad certificado (arnés, freno automático y roldana). Incluye 1 operador.', cap: '1 pasajero por turno de 5 minutos', fl: 72, mon: '45 minutos', med: '7 m de alto x 3 m de ancho', acc: 'Fácil acceso', en: 'No requiere electricidad', est: 'Niños, jóvenes y adultos', pub: 'Niños, jóvenes y adultos', elec: false },
    { id: 'noria', n: 'Rueda Noria Africana', cat: 'sus', a: ['rueda noria africana', 'noria africana', 'rueda noria', 'noria', 'rueda sustentable', 'fauna africana'], g: ['rueda'],
      d: 'Rueda de sillitas con temática de fauna exótica africana, movida a manivela (asistencia compartida). Es una de nuestras nuevas atracciones sustentables: consulta disponibilidad.', cap: 'Consulta con el equipo', fl: null, mon: 'Consulta con el equipo', med: '5 m de diámetro total con reja perimetral', acc: 'Remolque modular', en: 'Manivela, no requiere electricidad', est: 'Niños y adultos', pub: 'Niños y adultos', elec: false, nuevo: true },
    { id: 'mr_pedales', n: 'Montaña Rusa a Pedales', cat: 'sus', a: ['montana rusa a pedales', 'montana rusa sustentable', 'montana rusa ecologica', 'montana rusa de pedales'], g: ['montana rusa'],
      d: 'Niños y adultos juntos, pedaleando para mover la montaña rusa. Es una de nuestras nuevas atracciones sustentables: consulta disponibilidad.', cap: 'Consulta con el equipo', fl: null, mon: 'Consulta con el equipo', med: 'Según modelo, con reja perimetral', acc: 'Remolque modular', en: 'Pedaleo compartido, no requiere electricidad', est: 'Familias', pub: 'Familias', elec: false, nuevo: true },
    { id: 'paneles', n: 'Paneles Deportivos Inclusivos', cat: 'inc', a: ['paneles deportivos', 'paneles inclusivos', 'paneles de destreza', 'paneles'],
      d: 'Paneles de destreza e inclusión para todas las edades y capacidades. Fácil instalación y sin consumo de energía.', cap: '1 persona cada 3 minutos', fl: null, mon: '45 minutos', med: '2 m', acc: 'Fácil acceso', en: 'No requiere electricidad', est: 'Todas las edades y capacidades', pub: 'Todos', elec: false },
    { id: 'generadores', n: 'Generadores ARVI', cat: 'comp', a: ['generadores', 'generador', 'grupo electrogeno', 'kva'],
      d: 'Arrendamos generadores para parques de entretenciones, de 70 KVA y 110 KVA, por si el lugar no tiene la energía que piden los juegos.', cap: '70 KVA y 110 KVA', fl: null, mon: 'Consulta con el equipo', med: 'Generador en carro', acc: 'Consulta con el equipo', en: '70 KVA o 110 KVA', est: '—', pub: '—', elec: false, noride: true }
  ];
  var RBYID = {}; RIDES.forEach(function (r) { RBYID[r.id] = r; });
  var CAT_NAME = { mec: 'Mecánicos', sus: 'Sustentables', inc: 'Inclusivos', comp: 'Complementarios', acu: 'Acuáticos' };
  var CAT_ONE = { mec: 'juego mecánico', sus: 'juego sustentable', inc: 'juego inclusivo', comp: 'complementario', acu: 'juego acuático' };
  function short(r) { return r.d.split(/[.:]/)[0].replace(/\s+$/, ''); }

  /* ======================= UTILIDADES ======================= */
  var ABBR = [[/\bq\b/g, 'que'], [/\bk\b/g, 'que'], [/\bxq\b|\bpq\b|\bporq\b/g, 'porque'], [/\btb\b|\btmb\b|\btbn\b/g, 'tambien'], [/\bx\b/g, 'por'],
    [/\bd\b/g, 'de'], [/\bnecesito saber\b/g, ''], [/\bwsp\b|\bwasap\b|\bguasap\b|\bwhatsap\b|\bwhats\b|\bwasa\b/g, 'whatsapp'], [/\bcumple\b/g, 'cumpleanos'],
    [/\bcumples\b/g, 'cumpleanos'], [/\bstgo\b/g, 'santiago'], [/\bdcto\b|\bdesc\b/g, 'descuento'], [/\bmuni\b/g, 'municipalidad'], [/\bkb\b/g, 'que'], [/\bquest(a|an)\b/g, 'cuest$1'], [/\bkuanto\b|\bqnto\b|\bcnto\b/g, 'cuanto'], [/\bxfa\b|\bporfa\b|\bpor favor\b/g, ''], [/\bbn\b/g, 'bien'],
    [/\bnenes?\b|\bcabros chicos\b|\bpeques?\b|\bguaguas?\b/g, 'ninos chicos'], [/\blucas?\b/g, 'mil pesos'], [/\bvalen\b/g, 'valor'], [/\bsale\b/g, 'cuesta'], [/\bsalen\b/g, 'cuestan']];
  function norm(t) {
    t = (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n');
    t = t.replace(/[^a-z0-9$ ]/g, ' ').replace(/\s+/g, ' ').trim();
    ABBR.forEach(function (r) { t = t.replace(r[0], r[1]); });
    return ' ' + t.replace(/\s+/g, ' ').trim() + ' ';
  }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var m = [], i, j;
    for (i = 0; i <= a.length; i++) { m[i] = [i]; }
    for (j = 1; j <= b.length; j++) { m[0][j] = j; }
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  }
  // ¿la frase p (normalizada, sin espacios extremos) aparece en n? devuelve 0, 0.75 (con error de tipeo) o 1
  function hit(n, p, toks) {
    if (n.indexOf(' ' + p) > -1) return 1;
    if (p.indexOf(' ') > -1) {
      // frase: todas las palabras presentes (como prefijo), en cualquier orden
      var ws = p.split(' ').filter(function (w) { return STOP.indexOf(w) < 0; }), ok = 0;
      if (ws.length < 2) return 0;
      for (var i = 0; i < ws.length; i++) { if (n.indexOf(' ' + ws[i]) > -1 || fuzzyTok(ws[i], toks)) ok++; }
      return ok === ws.length ? 0.8 : 0;
    }
    return fuzzyTok(p, toks) ? 0.75 : 0;
  }
  var STOP = ['que', 'de', 'la', 'el', 'en', 'con', 'para', 'los', 'las', 'un', 'una', 'y', 'a', 'al', 'del', 'por', 'se', 'mi', 'es', 'lo', 'le', 'su', 'me', 'te', 'tu', 'como', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'hay', 'tienen', 'tiene'];
  var NOFUZZ = ['cuentan', 'cuenta', 'cuentas', 'cuento', 'puedo', 'pueden', 'quiero', 'queria', 'tienen', 'tiene', 'hacen', 'hacer', 'saber', 'sabes', 'cuando', 'donde', 'gracias', 'evento', 'eventos', 'juego', 'juegos', 'llevan', 'llegan', 'pagan', 'salon', 'salen'];
  function fuzzyTok(p, toks) {
    if (p.length < 5) return false;
    var lim = p.length >= 9 ? 2 : 1;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (t.length < 4 || t[0] !== p[0] || t.length < p.length - 1 || NOFUZZ.indexOf(t) > -1) continue;
      if (lev(t, p) <= lim) return true;
      if (t.length > p.length && lev(t.slice(0, p.length), p) <= (lim > 1 ? 1 : 0) && p.length >= 6) return true;
    }
    return false;
  }
  function score(n, toks, words) {
    var s = 0, got = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i], weight = 1;
      if (typeof w !== 'string') { weight = w[1]; w = w[0]; }
      var h = hit(n, w, toks);
      if (h) { got++; s += h * weight * (w.indexOf(' ') > -1 ? 1.6 : (w.length >= 7 ? 1.25 : 1)); }
    }
    return s;
  }
  function fmtN(x) { return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function waURL(text, num) { return 'https://wa.me/' + (num || WA_NUM) + '?text=' + encodeURIComponent(text); }

  /* ======================= ATRIBUTOS DE JUEGOS ======================= */
  var ATTR = {
    cap: ['capacidad', 'cuantas personas', 'cuantos ninos', 'cuantos suben', 'cuanta gente', 'por turno', 'cupo', 'caben', 'cuantos pasajeros', 'cuantas sillas', 'cuantos asientos', 'pasajeros', 'personas por'],
    fl: ['flujo', 'cuantas personas al dia', 'cuantos en el dia', 'por hora', 'en 6 horas', 'cuanta gente atiende', 'rendimiento', 'cuantos alcanzan'],
    mon: ['montaje', 'armar', 'arman', 'armado', 'instalar', 'instalacion', 'demora', 'tarda', 'cuanto se demoran', 'desmontaje'],
    med: ['medida', 'medidas', 'mide', 'miden', 'espacio', 'tamano', 'dimension', 'metros', 'superficie', 'cuanto ocupa', 'diametro', 'que tan grande', 'ancho', 'largo'],
    en: ['electricidad', 'luz', 'enchufe', 'energia', 'corriente', 'trifasic', 'monofasic', 'amper', 'electrico', 'voltaje', 'conexion', 'necesita generador'],
    est: ['estatura', 'altura', 'edad', 'edades', 'anos', 'pueden subir', 'pueden usar', 'apto', 'apta', 'requisito', 'restriccion', 'adultos pueden', 'para que edad', 'es para ninos', 'grandes', 'chicos pueden'],
    acc: ['acceso', 'porton', 'entrada del recinto', 'camion', 'remolque', 'pasa por', 'entra por', 'llegar con el camion'],
    precio: ['precio', 'valor', 'cuesta', 'cuestan', 'cuanto vale', 'cobran', 'tarifa', 'costo', 'cotiz', 'presupuesto', 'arriendo', 'arrendar']
  };
  function rideAttrAnswer(r, at) {
    var p;
    switch (at) {
      case 'cap': p = r.n + ': ' + r.cap + '.' + (r.fl ? ' En 6 horas atiende aproximadamente a ' + fmtN(r.fl) + ' personas.' : ''); break;
      case 'fl': p = r.fl ? r.n + ' atiende aproximadamente a ' + fmtN(r.fl) + ' personas en 6 horas (' + r.cap + ').' : r.n + ': ' + r.cap + '. El flujo depende del formato; el equipo te lo calcula para tu evento.'; break;
      case 'mon': p = 'El montaje de ' + r.n + ' toma ' + r.mon + '. Llegamos con anticipación para que esté listo antes de abrir, y el desmontaje también corre por nuestra cuenta.'; break;
      case 'med': p = r.n + ' ocupa ' + r.med + '. ' + (r.noride ? '' : 'Se instala en una superficie plana' + (r.acc && r.acc !== 'Fácil acceso' ? ', con acceso mínimo de ' + r.acc : '') + '.'); break;
      case 'en': p = r.n + ': ' + r.en + '.' + (r.elec ? ' Si el lugar no tiene esa conexión, también arrendamos generadores de 70 y 110 KVA.' : ''); break;
      case 'est': p = r.n + ': ' + r.est + '. Público: ' + r.pub + '.'; break;
      case 'acc': p = 'Para ' + r.n + ' el acceso mínimo es ' + r.acc + '. Necesitamos superficie plana y acceso vehicular hasta el punto de instalación.'; break;
      case 'precio': p = 'El valor de ' + r.n + ' depende de la fecha, la duración, la comuna y si lo combinas con otros juegos. Te enviamos la cotización sin compromiso por WhatsApp.'; break;
    }
    return { p: [p], acts: [['wa', 'Cotizar ' + r.n, 'Hola ARVI, quiero cotizar ' + r.n + ' para mi evento']], ride: r.id };
  }
  function rideCard(r) {
    var li = [];
    li.push('Capacidad: ' + r.cap + (r.fl ? ' (' + fmtN(r.fl) + ' personas en 6 h)' : ''));
    li.push('Montaje: ' + r.mon);
    li.push('Medidas: ' + r.med);
    li.push('Energía: ' + r.en);
    if (r.pub && r.pub !== '—') li.push('Público: ' + r.pub + (r.est && r.est !== r.pub && r.est !== '—' && r.est !== 'Juego familiar' ? ' · ' + r.est : ''));
    return { p: [r.n + ' (' + CAT_ONE[r.cat] + (r.nuevo ? ', nuevo' : '') + '). ' + r.d], li: li, acts: [['wa', 'Cotizar ' + r.n, 'Hola ARVI, quiero cotizar ' + r.n + ' para mi evento'], ['/catalogo/', 'Ver catálogo']], ride: r.id };
  }
  function listRides(filter, intro, max) {
    var rs = RIDES.filter(function (r) { return !r.noride && filter(r); });
    return { p: [intro], li: rs.slice(0, max || 20).map(function (r) { return r.n + ' — ' + short(r); }) };
  }

  /* ======================= INTENCIONES ======================= */
  // k: palabras clave (string o [string, peso]); ctx:'happy' => solo en contexto Happy; st: small talk
  var A = function (p, li, acts, extra) { var o = { p: [].concat(p) }; if (li) o.li = li; if (acts) o.acts = acts; if (extra) for (var k in extra) o[k] = extra[k]; return o; };
  var INTENTS = [
    /* ---------- cotización y arriendo ---------- */
    { id: 'precio', q: '¿Cuánto cuesta?', k: [['precio', 1.6], ['precios', 1.6], ['valor', 1.5], 'valores', ['cuesta', 1.6], ['cuestan', 1.6], ['cuanto vale', 1.5], ['cuanto cobran', 1.5], 'cobran', 'tarifa', 'costo', ['presupuesto', 1.8], ['cotizacion', 1.5], ['cotizar', 1.2], 'lista de precios', 'cuanto es', 'barato', 'caro', 'mil pesos'],
      r: A('Cada evento es distinto: el valor depende de los juegos, la cantidad de horas, la comuna y la fecha. Cuéntanos esos datos y te enviamos una cotización sin compromiso.', ['Tipo de evento y fecha', 'Comuna o lugar', 'Horario y duración', 'Cantidad aproximada de personas', 'Juegos que te interesan (si ya tienes alguno en mente)'], [['wa', 'Cotizar por WhatsApp', 'Hola ARVI, quiero cotizar juegos para mi evento'], ['#contacto', 'Ir al formulario']]) },
    { id: 'como_cotizar', q: '¿Cómo cotizo?', k: ['como cotizo', 'como cotizar', 'quiero cotizar', 'que datos', 'que informacion necesitan', 'como reservo', 'como arriendo', 'como contrato', 'contratar', 'reservar juegos', 'quiero arrendar', 'agendar', 'hacer una reserva'],
      r: A('¡Fácil! Escríbenos por WhatsApp o usa el formulario de la web con estos datos y te respondemos con una propuesta:', ['Tipo de evento y fecha', 'Comuna o dirección', 'Horario de funcionamiento', 'Cantidad aproximada de asistentes', 'Juegos de interés y espacio disponible'], [['wa', 'Cotizar por WhatsApp', 'Hola ARVI, quiero cotizar juegos para mi evento'], ['#contacto', 'Formulario']]) },
    { id: 'incluye', q: '¿Qué incluye el arriendo?', k: ['incluye', 'que incluye', 'incluido', 'incluida', 'viene con', 'servicio completo', ['llevan los juegos', 2], 'ustedes llevan', ['ponen', 1], ['gente que cuida', 2.5], ['cuida los juegos', 2.5], ['personal para los juegos', 2.5], ['cuidan los juegos', 2.5], 'traslado', 'flete', 'transporte', 'operadores', 'operador', 'personal', 'quien opera', 'quien maneja', 'desmontaje'],
      r: A('El arriendo es llave en mano. Incluye:', ['Traslado de los juegos al lugar del evento', 'Montaje (entre 2 y 4 horas en promedio, según los juegos)', 'Operadores capacitados durante todo el evento', 'Desmontaje y retiro al cierre'], [['wa', 'Cotizar', 'Hola ARVI, quiero cotizar juegos para mi evento']], { after: 'Tú solo nos indicas el lugar, la fecha y el horario.' }) },
    { id: 'montaje', q: '¿Cuánto demora el montaje?', k: ['montaje', 'montar', 'cuanto demora', 'cuanto se demoran', 'cuanto tardan', 'tiempo de instalacion', 'instalacion', 'armar', 'arman', 'llegan antes', 'a que hora llegan', 'con cuanto tiempo llegan'],
      r: A('Entre 2 y 4 horas en promedio, según los juegos (por ejemplo, el Tagadá o el Barco Pirata se montan en 45 minutos, y la Montaña Rusa Dragón en 3 horas). Coordinamos la llegada para que todo esté listo antes de abrir.') },
    { id: 'regiones', q: '¿Llegan a regiones?', k: ['region', 'regiones', 'llegan a', 'viajan', 'hacen eventos en', 'trabajan en', 'cobertura', 'todo chile', 'arica', 'punta arenas', 'norte', 'sur', 'iquique', 'antofagasta', 'calama', 'copiapo', 'la serena', 'coquimbo', 'valparaiso', 'vina del mar', 'rancagua', 'talca', 'chillan', 'concepcion', 'temuco', 'valdivia', 'osorno', 'puerto montt', 'chiloe', 'coyhaique', 'santiago', 'fuera de santiago', 'mi comuna', 'mi ciudad', 'despacho'],
      r: A('¡Sí! Trabajamos de Arica a Punta Arenas. Nuestros juegos vienen en formato remolque y modular, así que llegamos a todo Chile. El traslado se considera en la cotización según la distancia.', null, [['wa', 'Cotizar para mi ciudad', 'Hola ARVI, quiero cotizar juegos para un evento en ']]) },
    { id: 'anticipacion', q: '¿Con cuánta anticipación reservo?', k: ['anticipacion', 'cuanto antes', 'con cuanto tiempo', 'disponibilidad', 'disponible', 'tienen fecha', 'fecha libre', 'para manana', 'para hoy', 'este fin de semana', 'urgente', 'ultimo minuto', 'quedan fechas'],
      r: A('La disponibilidad depende de la fecha y de los juegos. Te recomendamos cotizar con la mayor anticipación posible, sobre todo para fechas de alta demanda como el Día del Niño, Fiestas Patrias, Navidad y el verano. Para revisar una fecha puntual, escríbenos:', null, [['wa', 'Consultar una fecha', 'Hola ARVI, quiero saber si tienen disponibilidad para el ']]) },
    { id: 'pago', q: 'Pagos y facturación', k: ['pago', 'pagar', 'forma de pago', 'formas de pago', 'transferencia', 'tarjeta', 'efectivo', 'credito', 'debito', 'factura', 'boleta', 'orden de compra', 'abono', 'cuotas', 'pago anticipado'],
      r: A('Las condiciones de pago y facturación del arriendo se coordinan con el equipo al confirmar la cotización. Trabajamos con instituciones públicas y privadas (orden de compra, factura, etc.).', null, [['wa', 'Consultar condiciones', 'Hola ARVI, quiero consultar las formas de pago y facturación para un arriendo']]) },
    { id: 'cancelar_arriendo', q: 'Cancelar o cambiar fecha', k: ['cancelar', 'cancelacion', 'anular', 'suspender', 'cambiar la fecha', 'reagendar', 'postergar', 'devolucion', 'reembolso'],
      r: A('Para cambios o cancelaciones de un arriendo de juegos, el equipo revisa tu caso directamente. Escríbenos con los datos de tu reserva:', null, [['wa', 'Hablar con el equipo', 'Hola ARVI, necesito cambiar o cancelar mi reserva de juegos']]) },
    { id: 'clima', q: '¿Y si llueve?', k: ['llueve', 'lluvia', 'clima', 'viento', 'mal tiempo', 'temporal', 'calor', 'sol', 'techado', 'bajo techo', 'interior', 'gimnasio', 'en un gimnasio', 'dentro de un recinto'],
      r: A('La seguridad va primero: con lluvia o viento fuerte el equipo evalúa en terreno qué juegos pueden operar. Varios juegos se pueden instalar bajo techo (inflables, Cine 9D, stands de feria, paneles inclusivos, entre otros) si el recinto tiene la altura y el acceso necesarios. Cuéntanos tu lugar y te asesoramos:', null, [['wa', 'Consultar mi caso', 'Hola ARVI, quiero saber qué juegos se pueden instalar en ']]) },
    /* ---------- requerimientos técnicos ---------- */
    { id: 'electricidad', q: '¿Qué energía necesitan?', k: ['electricidad', 'luz', 'enchufe', 'energia electrica', 'corriente', 'trifasica', 'monofasica', 'amperes', 'empalme', 'conexion electrica', 'necesitan luz', 'sin luz', 'generador', 'generadores'],
      r: A('Depende del juego:', ['Mecánicos grandes (Tagadá, Barco Pirata, Montaña Rusa Dragón, Rueda, Globos, Sillitas): trifásica 5x32A', 'Carrusel, Cine 9D, inflables y la mayoría de los juegos infantiles: monofásica 16A', 'Sin electricidad: juegos sustentables, Alfombra Mágica, Tren de Fantasía, stands de feria, Zona de Circo, Martillo y paneles inclusivos'], [['wa', 'Consultar requerimientos', 'Hola ARVI, quiero saber qué energía necesito para los juegos de mi evento']], { after: 'Si el lugar no tiene la conexión necesaria, arrendamos generadores de 70 y 110 KVA.' }) },
    { id: 'espacio', q: '¿Cuánto espacio necesito?', k: ['espacio', 'cuanto espacio', 'metros cuadrados', 'm2', 'superficie', 'terreno', 'plano', 'pasto', 'cesped', 'tierra', 'pavimento', 'cancha', 'patio', 'plaza', 'acceso vehicular', 'porton', 'espacio chico', 'poco espacio', 'patio chico', 'espacio reducido'],
      r: A('Cada juego tiene su medida. Necesitamos una superficie plana y, para los juegos en remolque, acceso vehicular hasta el punto de instalación (mínimo 4 x 4 x 4 m). Algunas referencias:', ['Para espacios pequeños: Martillo (2 x 3 m), Paneles inclusivos (2 m), Giroscopio (3,5 m), Inflables y Gladiadores (4 x 4 m)', 'Medianos: Reloj Derribador (6 m), Toro Mecánico (6 m), Tagadá (8 x 9,5 m), Carrusel (9 m)', 'Grandes: Barco Pirata (10 x 5 m), Globos y Sillitas (10 m), Montaña Rusa Dragón (20 x 11 m), Canopy (80 m de extensión)'], [['wa', 'Asesoría de espacio', 'Hola ARVI, tengo un espacio de aproximadamente ___ metros y quiero saber qué juegos caben']]) },
    /* ---------- catálogo y recomendaciones ---------- */
    { id: 'juegos', q: '¿Qué juegos tienen?', k: [['juegos', 0.5], ['que juegos', 1.2], 'que atracciones', 'atracciones', ['catalogo', 0.6], ['opciones', 0.5], ['que tienen', 0.4], 'que ofrecen', 'que arriendan', 'lista de juegos', 'mecanicos', 'juegos mecanicos', 'entretenciones', 'todos los juegos'],
      r: function () {
        var by = {}; RIDES.forEach(function (r) { if (r.noride) return; (by[r.cat] = by[r.cat] || []).push(r.n); });
        var li = []; ['mec', 'sus', 'inc', 'acu', 'comp'].forEach(function (c) { if (by[c]) li.push(CAT_NAME[c] + ': ' + by[c].join(', ')); });
        return A('Tenemos más de 30 atracciones:', li, [['/catalogo/', 'Ver catálogo completo'], ['#juegos', 'Ver juegos']], { after: 'Pregúntame por cualquiera y te doy su ficha (capacidad, montaje, medidas y energía).' });
      } },
    { id: 'rec_peques', q: 'Juegos para niños pequeños', k: ['ninos chicos', 'ninos pequenos', 'preescolar', 'pre escolar', 'jardin infantil', 'parvulos', 'bebes', 'para los mas chicos', 'menores de 5', 'de 3 anos', 'de 2 anos', 'de 4 anos', 'primera infancia', 'para ninos de'],
      r: function () { return listRides(function (r) { return ['aviones', 'tren_riel', 'lanchitas', 'carrusel', 'globos', 'inflables', 'reloj', 'sillitas_sus', 'carrusel_sus', 'gokart', 'feria'].indexOf(r.id) > -1; }, 'Para los más pequeños te recomendamos:'); } },
    { id: 'rec_grandes', q: 'Juegos para jóvenes y adultos', k: ['adultos', 'jovenes', 'adolescentes', 'para grandes', 'para adultos', 'mas extremo', 'adrenalina', 'emocion fuerte', 'para todas las edades', 'universitarios', 'team building', 'trabajadores', 'fiesta de empresa'],
      r: function () { return listRides(function (r) { return ['tagada', 'dragon', 'barco', 'toro', 'gladiadores', 'canopy', 'martillo', 'cine', 'muro_eco', 'giroscopio', 'bungy'].indexOf(r.id) > -1; }, 'Para jóvenes y adultos, los favoritos son:'); } },
    { id: 'rec_top', q: 'Los más populares', k: [['mas popular', 3], ['mas populares', 3], ['favorito', 2], ['favoritos', 2], ['mas pedido', 3], ['mas pedidos', 3], ['mas solicitado', 3], ['que me recomiendas', 1], ['que me recomiendan', 1], ['recomendacion', 1], ['mejor juego', 2.5], ['el mejor', 1.5], ['mas entretenido', 2.5]],
      r: A('Los más pedidos en nuestros eventos:', ['Tagadá: giros y saltos, ¡el de la fila más larga! (jóvenes y adultos)', 'Barco Pirata: la atracción estrella para todas las edades', 'Montaña Rusa Dragón: velocidad para niños y familias', 'Rueda Chicago: vistas panorámicas, ideal para familias', 'Inflables y Globos Samba: los favoritos de los más pequeños'], [['wa', 'Armar mi combinación', 'Hola ARVI, quiero que me recomienden juegos para mi evento']], { after: 'Cuéntame la edad del público y el tipo de evento, y te recomiendo una combinación.' }) },
    { id: 'rec_masivo', q: 'Eventos masivos', k: ['masivo', 'masivos', 'mucha gente', 'miles de personas', 'harta gente', 'alto flujo', 'evento grande', 'fonda', 'fondas', 'fiestas patrias', 'dieciocho', 'aniversario comunal', 'festival', 'feria', 'kermesse', 'feria costumbrista', ['atiende mas gente', 3], ['mas gente', 2], ['mas flujo', 2.5], ['mas personas', 2], ['costumbrista', 2], 'evento comunal', 'aniversario de la comuna', 'que me recomiendan para', 'concierto', 'show masivo'],
      r: A('Para eventos masivos conviene combinar juegos de alto flujo (personas atendidas en 6 horas):', ['Tagadá: 1.800', 'Globos Samba: 1.300', 'Muro Inflable: 1.300', 'Rueda Chicago: 1.296', 'Alfombra Mágica: 1.153', 'Barco Pirata: 1.152'], [['wa', 'Armar propuesta', 'Hola ARVI, estamos organizando un evento masivo y queremos una propuesta de juegos']], { after: 'Además, por cada 2 juegos mecánicos en arriendo sumamos decorativos sin costo.' }) },
    { id: 'rec_sinluz', q: 'Juegos sin electricidad', k: [['sin electricidad', 2.5], ['sin luz', 2], ['no necesitan luz', 2.5], ['no requieren electricidad', 2.5], ['no necesiten electricidad', 2.5], ['no necesiten luz', 2.5], ['no usen electricidad', 2.5], ['no ocupen luz', 2.5], ['no hay luz', 2], ['no hay electricidad', 2], 'no tenemos luz', 'sin enchufe', 'manual', 'manuales'],
      r: function () { return listRides(function (r) { return !r.elec && !r.noride; }, 'Estos juegos funcionan sin electricidad (algunos usan energía solo para montar):'); } },
    { id: 'rec_verano', q: 'Juegos acuáticos', k: ['agua', 'acuatico', 'acuaticos', 'piscina', 'mojarse', 'dia de calor', 'refrescar'],
      r: function () { return listRides(function (r) { return r.cat === 'acu'; }, 'Para días de calor tenemos juegos acuáticos con operador y control sanitario (limpieza, cloración y pH):'); } },
    { id: 'complementarios', q: 'Promoción decorativos', k: ['complementario', 'complementarios', 'decorativos', 'decoracion del evento', 'promocion', 'promo', 'oferta', 'descuento', 'regalo', 'gratis', 'sin costo', 'bonus'],
      r: A('Por cada 2 juegos mecánicos en arriendo, te sumamos elementos decorativos complementarios sin costo. También puedes agregar stands de Feria Americana o una Zona de Circo para animar el evento.', null, [['wa', 'Cotizar con la promoción', 'Hola ARVI, quiero cotizar 2 o más juegos mecánicos con los decorativos sin costo']]) },
    /* ---------- seguridad y empresa ---------- */
    { id: 'seguridad', q: 'Seguridad y seguros', k: ['seguridad', 'seguro', 'es seguro', 'son seguros', 'seguros vigentes', 'certificacion', 'certificado', 'certificados', 'iaapa', 'achs', 'mutual', 'sec', 'norma', 'normativa', 'mantencion', 'accidente', 'riesgo', 'confiable', ['permisos', 2], ['cuentan con permisos', 3], 'resolucion sanitaria', 'poliza'],
      r: A('La seguridad es lo primero:', ['Normados por IAAPA, entidad internacional de seguridad y fabricación de juegos', 'Cumplimos los instructivos de seguridad ACHS (Mutual) y la normativa chilena', 'Mantenciones periódicas y tableros eléctricos certificados por la SEC', 'Seguros vigentes y operadores capacitados en cada juego'], null, { after: 'Si tu municipio o recinto pide documentación (fichas técnicas, seguros, etc.), te la preparamos.' }) },
    { id: 'empresa', q: '¿Quiénes son?', k: ['quienes son', 'quienes somos', ['empresa chilena', 3], ['son chilenos', 3], ['hace cuanto', 2], ['existen', 1.5], ['cuanto tiempo llevan', 2.5], 'antiguedad', ['imitaciones', 3], ['imitacion', 3], ['originales', 2], ['original', 1.5], ['copias', 2], 'la empresa', 'experiencia', 'trayectoria', 'cuantos anos', 'desde cuando', 'fabricantes', ['fabrican', 2], ['fabrican sus juegos', 3], 'fabricacion', 'hechos en chile', 'nacional', 'confianza', 'referencias', 'son serios'],
      r: A('No aceptes imitaciones: ARVI es una empresa chilena con más de 20 años diseñando, fabricando y operando juegos mecánicos, sustentables e inclusivos. Llevamos más de 1.000 eventos realizados de Arica a Punta Arenas, con fabricación 100% nacional, repuestos y soporte propio.', null, [['#eventos', 'Eventos realizados']]) },
    { id: 'eventos', q: 'Eventos realizados', k: ['eventos realizados', 'donde han estado', 'clientes', 'han trabajado', 'experiencia en', 'trabajos anteriores', 'portafolio', 'fotos', 'testimonios', 'opiniones', 'resenas', ['donde han hecho', 2], 'han hecho eventos', 'eventos anteriores', 'donde han ido', 'chile lindo', 'vitacura', 'el quisco', 'los dominicos', 'putaendo', 'monte tabor'],
      r: A('Algunos eventos donde hemos estado:', ['Chile Lindo 2025 en Vitacura', 'Temporada de verano 2026 en El Quisco', 'Día del Niño en Paseo Los Dominicos', 'Fin de semana en la Municipalidad de Putaendo', 'Colegio Monte Tabor y Nazaret', 'Ferias, festivales, aniversarios comunales y Navidad'], [['#eventos', 'Ver eventos'], ['https://www.instagram.com/arvi.cl/', 'Ver Instagram']]) },
    { id: 'b2b', q: 'Municipios, colegios y empresas', k: ['municipio', 'municipios', 'municipalidad', 'licitacion', 'licitaciones', 'mercado publico', 'chileproveedores', 'chilecompra', 'compra agil', 'trato directo', 'colegio', 'colegios', 'escuela', 'liceo', 'empresa', 'empresas', 'corporativo', 'productora', 'productoras', 'organizacion', 'fundacion', 'centro de padres', 'junta de vecinos', 'mall', 'centro comercial', 'condominio', 'institucion', 'dia del nino', 'navidad', 'fin de ano', 'aniversario'],
      r: A('Sí, trabajamos con municipios, colegios, jardines, empresas, productoras, centros comerciales y organizaciones sociales: Día del Niño, aniversarios comunales, fiestas de fin de año, Navidad, festivales y más. Preparamos fichas técnicas, propuestas y la documentación que piden las bases (licitaciones, Mercado Público y ChileProveedores).', null, [['wa', 'Pedir propuesta', 'Hola ARVI, escribo de una institución y quiero una propuesta de juegos'], [PDF.muni, 'Convenio municipalidades']]) },
    { id: 'venta', q: '¿Venden juegos?', k: ['venden', 'venta', 'vender', 'comprar un juego', 'comprar juegos', 'fabricar un juego', 'a pedido', 'a medida', 'mandar a hacer', 'franquicia', 'socio', 'invertir'],
      r: A('Somos fabricantes y desarrollamos proyectos a medida. Si te interesa la fabricación de un juego, un proyecto especial o una alianza, conversemos directamente con el equipo:', null, [['wa', 'Hablar con el equipo', 'Hola ARVI, me interesa la fabricación / compra de un juego o un proyecto a medida']]) },
    { id: 'trabajo', q: 'Trabajar en ARVI', k: [['busco trabajo', 2], ['buscan', 1.5], ['buscan operadores', 3], ['buscan personal', 3], 'trabajo', ['trabajar con ustedes', 2], 'empleo', 'pega', 'postular', 'curriculum', 'cv', 'vacante', 'operador de juegos', 'practica', 'monitor', 'monitora'],
      r: A('¡Gracias por tu interés! Envía tu CV a ' + C.mail + ' indicando el cargo o la zona donde te gustaría trabajar.', null, [['mailto:' + C.mail + '?subject=Postulaci%C3%B3n%20ARVI', 'Enviar correo']]) },
    /* ---------- sustentable e inclusivo ---------- */
    { id: 'sustentable', q: 'Juegos sustentables', k: ['sustentable', 'sustentables', 'ecologico', 'ecologicos', 'eco', 'pedales', 'pedal', 'bicicleta', 'manivela', 'balancin', 'palanca', 'energia limpia', 'energia humana', 'medio ambiente', 'reciclaje', 'reciclado', 'verde', 'dresina', 'cinetica', 'conciencia ambiental'],
      r: A('ARVI Sustentable: juegos que funcionan con energía 100% limpia generada por las personas (pedales, balancines, manivelas y palancas, con nuestro sistema DRESINA). No necesitan electricidad. Desde 2018 fomentamos las energías renovables a través del juego.', ['Carrusel Sustentable: animales en peligro de extinción de Chile, a pedales', 'Sillitas Voladoras Sustentables: animales marinos, a manivela (hasta 10 años)', 'Rueda Noria Africana: fauna africana, a manivela (nueva)', 'Montaña Rusa a Pedales: niños y adultos juntos (nueva)', 'Giroscopio Manual y Muro ECO de escalada'], [['#sustentable', 'Ver ARVI Sustentable'], [PDF.muni, 'Proyectos para municipios']]) },
    { id: 'proyectos_muni', q: 'Proyectos para municipios', k: [['municipio verde', 3], ['municipio verde en tu escuela', 3], ['ecodiversion', 3], ['eco diversion', 3], ['proyecto municipal', 2.5], ['proyectos para municipios', 2.5], ['proyectos sustentables', 2], 'programa municipal', 'jardines municipales', 'colegios municipales', 'itinerante'],
      r: A('Tenemos dos proyectos sustentables itinerantes para municipalidades:', ['"Municipio Verde en tu Escuela": juegos ecológicos en colegios municipales para fomentar la conciencia ambiental', '"ECODIVERSIÓN Infantil": intervenciones en jardines infantiles municipales, con juegos sin energía y materiales reciclados'], [[PDF.muni, 'Descargar proyectos'], ['wa', 'Quiero el proyecto en mi comuna', 'Hola ARVI, me interesa llevar un proyecto sustentable a mi comuna']]) },
    { id: 'inclusivo', q: 'Juegos inclusivos', k: ['inclusivo', 'inclusivos', 'inclusion', 'silla de ruedas', 'discapacidad', 'discapacitados', 'accesible', 'accesibilidad', 'rampa', 'movilidad reducida', 'capacidades diferentes', 'neurodivergente', 'paralisis'],
      r: A('Nadie se queda abajo. Nuestro Carrusel Inclusivo tiene rampa de acceso a la plataforma, espacio y cinturón de seguridad para silla de ruedas junto a las figuras, señalética inclusiva y un operador acompañando. También tenemos Paneles Deportivos Inclusivos para todas las edades y capacidades.', null, [['#inclusivo', 'Ver carrusel inclusivo'], ['wa', 'Cotizar carrusel inclusivo', 'Hola ARVI, quiero cotizar el carrusel inclusivo']]) },
    { id: 'seguro', q: 'ARVI Seguro (NEE)', k: [['arvi seguro', 4], ['nee', 2], ['necesidades educativas', 2.5], ['necesidades especiales', 2.5], ['autismo', 2.5], ['autista', 2.5], ['tea', 2], ['tdah', 2.5], ['sindrome de down', 2.5], ['sensorial', 2], 'terapia', ['educacion especial', 2], ['integracion', 1.5]],
      r: A('ARVI Seguro, parte de ARVI Happy, crea espacios inclusivos y seguros para niños con Necesidades Educativas Especiales (NEE): diseño inclusivo y accesible, seguridad certificada y juego y aprendizaje adaptado. Está pensado para establecimientos educativos, municipios y programas de educación inclusiva, y fundaciones y organizaciones sociales.', null, [['#arvi-seguro', 'Ver ARVI Seguro'], [PDF.seguro, 'Descargar propuesta'], ['wa', 'Agendar una visita', 'Hola, quiero conocer ARVI Seguro y agendar una visita', WA_HAPPY]]) },
    /* ---------- verano 2027 ---------- */
    { id: 'verano', q: 'Verano 2027', k: [['verano', 2], ['algarrobo', 3], ['papudo', 3], 'playa', 'vacaciones', '2027', 'costa', 'litoral', 'balneario', 'temporada', 'boleto', 'boletos', 'entrada', 'entradas', 'ticket', 'fichas', '2000', '2 000', 'dos mil', 'parque arvi', 'enero', 'febrero'],
      r: A('¡Volvemos a Algarrobo! Este verano 2027 regresamos a Algarrobo y, por primer año, llegamos a Papudo, un balneario familiar, con juegos para niños y familias. Los boletos para juegos cuestan solo $2.000.', null, [['#verano', 'Ver Verano 2027'], ['wa', 'Avísame las fechas', 'Hola ARVI, quiero información del verano 2027 en Algarrobo y Papudo']], { after: 'Las fechas, horarios y ubicación exacta se publicarán muy pronto en nuestras redes (@arvi.cl).' }) },
    /* ---------- ARVI Happy ---------- */
    { id: 'happy', q: 'ARVI Happy (cumpleaños)', k: ['arvi happy', 'happy', 'cumpleanos', 'salon', 'salon de cumpleanos', 'fiesta infantil', 'celebrar', 'celebracion', 'festejo', 'fiesta de mi hijo', 'fiesta de mi hija', 'cumpleanos de mi hijo', 'cumpleanos de mi hija', 'arrendar el salon', 'local para cumpleanos'],
      r: A('ARVI Happy es nuestro salón de cumpleaños en ' + C.happyDir + ', pensado para niños y niñas de 1 a 10 años, con 3 horas de uso exclusivo y capacidad para 70 personas. Los niños se divierten en la zona de juegos (laberinto, piscina de pelotas, inflables y más) y los papás disfrutan tranquilos en la zona de padres, con vista directa a las atracciones. Valores desde $150.000. ¿Qué te gustaría saber?', null, [['/happy/', 'Ver valores y detalles'], ['wa', 'Reservar fecha', 'Hola ARVI HAPPY, quiero reservar un cumpleaños', WA_HAPPY], [PDF.happy, 'Descargar información']], { ctx: 'happy' }) },
    { id: 'h_precio', ctx: 'happy', q: 'Valores', k: [['precio', 1.8], ['precios', 1.8], ['valor', 1.8], ['valores', 1.8], ['cuesta', 1.8], ['cuestan', 1.8], 'cuanto vale', 'cuanto cobran', 'tarifa', 'costo', 'cuanto es', 'cotizar', 'mil pesos'],
      r: A('Valores 2026 (vigentes hasta el 31 de diciembre de 2026), por 3 horas de uso exclusivo, con televisión y parlante incluidos:', ['Lunes a viernes: $150.000', 'Sábado, domingo y festivos en la mañana (11:00 a 14:00): $180.000', 'Sábado, domingo y festivos en la tarde (16:00 a 19:00 o 17:00 a 20:00): $200.000', 'Hora adicional: $50.000 (solo en horario PM de viernes y sábado)', 'Garantía: $50.000, se devuelve después de verificar el local'], [['/happy/#valores', 'Calcular mi celebración'], ['wa', 'Consultar disponibilidad', 'Hola ARVI HAPPY, quiero consultar disponibilidad para un cumpleaños', WA_HAPPY]], { after: 'Valores referenciales sujetos a disponibilidad. ¿Eres de un jardín, colegio o municipio? Pregúntame por los convenios.' }) },
    { id: 'h_ninos', ctx: 'happy', q: '¿Cuántos niños incluye?', k: [['nino extra', 3], ['ninos extra', 3], ['cada nino', 2.5], ['nino adicional', 3], '20 ninos', 'mas de 20', 'mas ninos', 'nino adicional', 'ninos adicionales', 'cuantos ninos', 'cuantos ninos incluye', 'por nino', 'cada nino', 'valor por nino', 'si son mas'],
      r: A('El valor es por el arriendo exclusivo del salón por 3 horas. La capacidad máxima es de 70 personas en total, entre niños y adultos. Si tienes un grupo grande o una actividad de curso, escríbenos y lo revisamos:', null, [['wa', 'Consultar mi caso', 'Hola ARVI HAPPY, quiero consultar por un cumpleaños con muchos invitados', WA_HAPPY]]) },
    { id: 'h_incluye', ctx: 'happy', q: '¿Qué incluye?', k: ['incluye', 'que incluye', 'que trae', 'que tiene', 'que hay', 'juegos', 'equipado', 'arcade', 'taca taca', 'air hockey', 'basquetbol', 'laberinto', 'pelotas', 'piscina de pelotas', 'inflable', 'mesas', 'sillas', 'letrero', 'kiddie', 'zona de ninos', 'zona de padres', 'terraza'],
      r: A('El arriendo del salón incluye:', ['3 horas de uso exclusivo de todos los juegos y espacios', 'Zona de juegos: laberinto modular con piscina de pelotas, arcade, taca-taca, air hockey, arcade de básquetbol y 3 kiddies', 'Rincón preescolar: inflable, balancín, tobogán y juegos soft', 'Mesas y sillas para niños (10 preescolares y 10 para mayores de 5 años) y letrero de neón "Feliz Cumpleaños"', 'Zona de padres con sillón, mesas, terraza y cocina equipada, con vista directa a los juegos', 'Televisión y parlante', 'Capacidad máxima: 70 personas (niños y adultos)'], [['/happy/#incluye', 'Ver el salón'], ['wa', 'Reservar fecha', 'Hola ARVI HAPPY, quiero reservar un cumpleaños', WA_HAPPY]]) },
    { id: 'h_capacidad', ctx: 'happy', q: 'Capacidad', k: ['capacidad', 'cuantas personas', 'cuanta gente', 'invitados', 'maximo de personas', 'aforo', 'caben', 'cuantos adultos', 'cuantos invitados'],
      r: A('La capacidad máxima es de 70 personas en total, entre niños y adultos. Para convenios de jardines y colegios, hasta 90 personas.') },
    { id: 'h_edad', ctx: 'happy', q: '¿Para qué edades?', k: ['edad', 'edades', 'anos', 'para que edad', 'guagua', 'bebe', 'de 1 ano', ['cumpleanos 11', 2], ['cumpleanos 12', 2], ['11 anos', 2], ['12 anos', 2], ['13 anos', 2], ['de 11', 1.5], ['de 12', 1.5], 'adolescente', 'nino grande', 'mayores de 10', 'puede ser'],
      r: A('ARVI Happy está pensado para celebrar desde 1 hasta 10 años, y no hacemos excepciones. Para cumpleaños de niños mayores o adolescentes, podemos llevar juegos a tu evento: pregúntame por los juegos para jóvenes.') },
    { id: 'h_donde', ctx: 'happy', q: '¿Dónde queda?', k: ['donde', 'donde queda', 'donde estan', 'ubicacion', 'ubicados', 'direccion', 'como llego', 'el bosque', ['esta en', 1.2], ['santiago', 1.5], 'abate molina', 'comuna', 'estacionamiento', 'metro', 'como llegar', 'mapa'],
      r: A('ARVI Happy está en ' + C.happyDir + ', cerca del Metro Observatorio (te recomendamos llegar en metro para evitar complicaciones de estacionamiento). Nuestras monitoras reciben a tus invitados.', null, [['https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Abate Molina 866, El Bosque, Santiago'), 'Ver en el mapa'], ['wa', 'Pedir indicaciones', 'Hola ARVI HAPPY, ¿cómo llego al salón?', WA_HAPPY]]) },
    { id: 'h_reserva', ctx: 'happy', q: 'Reserva y pago', k: ['reserva', 'reservar', 'contratar', 'arrendar el salon', 'como reservo', 'pago', 'pagar', 'abono', 'garantia', 'saldo', 'transferencia', 'efectivo', 'tarjeta', 'forma de pago', 'formas de pago', 'debito', 'credito', 'cuando pago', 'adelanto', 'anticipo', 'contrato'],
      r: A('Así funciona la reserva:', ['Reservas con el 50% del valor, por transferencia o en efectivo', 'Envía el comprobante a ' + C.mailHappy, 'El saldo y la garantía ($50.000) se pagan al menos un día antes del evento (si quieres pagar antes, no hay problema)', 'La garantía se devuelve, generalmente al día siguiente, una vez verificado que todo está en perfecto estado'], [['/happy/#pagos', 'Datos de transferencia y facturación'], ['wa', 'Reservar fecha', 'Hola ARVI HAPPY, quiero reservar un cumpleaños', WA_HAPPY]]) },
    { id: 'h_cancela', ctx: 'happy', q: 'Cancelar o reagendar', k: [['cancel', 1.5], ['devuelv', 1.5], ['devuelven la plata', 2.5], ['me devuelven', 2], 'cancelar', 'cancelacion', 'reagendar', 'cambiar la fecha', 'cambiar fecha', 'devolucion', 'reembolso', 'postergar', 'anular', 'me arrepenti', 'enfermo', 'enferma'],
      r: A('Políticas de cambio y cancelación:', ['Te devolvemos el 100% de la reserva si cancelas con al menos 30 días de anticipación; pasado ese plazo no hay devolución', 'Reagendar no tiene costo adicional, según la disponibilidad de fechas', 'Si se corta la luz por causas ajenas (apagón, tormenta, sismo), puedes esperar un tiempo prudente o suspender: te devolvemos el 50% del total o reagendas sin costo dentro de los 3 meses siguientes'], [['wa', 'Hablar con ARVI Happy', 'Hola ARVI HAPPY, necesito cambiar la fecha de mi reserva', WA_HAPPY]]) },
    { id: 'h_horario', ctx: 'happy', q: 'Horarios y duración', k: ['horario', 'horarios', 'a que hora', 'cuanto dura', 'duracion', 'cuantas horas', 'llegar antes', 'entregan', 'preparar', 'desocupar', 'hora de llegada', 'hora adicional', 'hora extra', 'extender', 'mas horas', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo', 'festivo', 'feriado', 'en la tarde', 'en la manana', 'fin de semana', 'dia de semana'],
      r: A('El arriendo es por 3 horas de uso exclusivo. Bloques disponibles:', ['Mañana: 11:00 a 14:00', 'Tarde: 16:00 a 19:00, o alternativo de 17:00 a 20:00', 'Hora adicional: $50.000, solo en horario PM de viernes y sábado', 'Te entregamos el local 1 hora antes para decorar y organizar; 5 minutos después del término se apagan los juegos y tienes máximo 15 minutos para desocupar'], [['/happy/#valores', 'Ver valores']]) },
    { id: 'h_cocina', ctx: 'happy', q: 'Cocina y baños', k: ['cocina', 'horno', 'microondas', 'termo', 'refrigerador', 'refri', 'congelador', 'dispensador', 'agua', 'bano', 'banos', 'mudador', 'silla de comer', 'aseo', 'papel higienico', 'basurero', 'jabon', 'toalla'],
      r: A('La cocina cuenta con horno eléctrico, microondas, termo, refrigerador, congeladora, dispensador de agua y silla de comer. Hay 2 baños y mudador.', ['Entregamos basureros con bolsa, 2 papeles higiénicos, 1 toalla de papel y jabón (no hay adicionales)', 'Trae tus desechables (platos, vasos y cubiertos), además de té, café y azúcar']) },
    { id: 'h_comida', ctx: 'happy', q: 'Comida y servicios externos', k: ['comida', 'llevar comida', 'catering', 'carrito', 'completos', 'papas fritas', 'torta', 'pastel', 'bebida', 'bebidas', 'desechables', 'platos', 'vasos', 'parrilla', 'asado', 'anticucho', 'algodon', 'granizado', 'cabritas', 'pizza', 'sushi', 'food truck'],
      r: A('Puedes llevar tu comida y como máximo un servicio externo (por ejemplo, carrito de completos o papas fritas, incluso a gas). No se permiten máquinas de cabritas, algodón ni granizado, ni encender parrilla: es un espacio familiar donde cuidamos la seguridad de los niños. No se puede comer en las zonas de juego.', null, null) },
    { id: 'h_deco', ctx: 'happy', q: 'Decoración', k: ['decorar', 'decoracion', 'decorador', 'globos', 'candy', 'tematica', 'tematico', 'pegar', 'masking', 'mobiliario', 'mover las mesas', 'personaje'],
      r: A('¡Sí, puedes decorar por tu cuenta! Solo no pegues con masking ni productos que dañen las paredes. También puedes contratar a nuestro decorador de candy temático o traer un decorador externo. El mobiliario es fijo y no se puede cambiar de lugar.', null, [['wa', 'Cotizar decoración', 'Hola ARVI HAPPY, quiero cotizar la decoración temática para un cumpleaños', WA_HAPPY]]) },
    { id: 'h_reglas', ctx: 'happy', q: '¿Qué no se permite?', k: ['permite', 'permiten', 'prohibido', 'prohibe', 'reglas', 'condiciones', 'alcohol', 'cerveza', 'vino', 'copete', 'trago', 'confeti', 'challa', 'lanza confeti', 'parlante', 'parlantes', 'musica', 'mascota', 'perro', 'animales', 'juegos extra', 'llevar juegos', 'llevar inflable', 'fumar', 'cigarro', 'zapatos', 'calzado'],
      r: A('Para cuidar a los niños y el lugar, no se permite:', ['Alcohol (es un espacio familiar)', 'Challas, confeti ni lanza confeti', 'Cabritas ni artículos eléctricos externos (parlantes, hornos, etc.; el salón ya incluye televisión y parlante)', 'Animales', 'Llevar juegos extra', 'Comer o entrar con calzado a las zonas de juego'], null, { after: 'Los niños deben estar siempre supervisados por un adulto, y el cliente es responsable de daños o pérdidas ocasionados por sus invitados.' }) },
    { id: 'h_monitor', ctx: 'happy', q: 'Monitoras', k: ['monitora', 'monitoras', 'monitor', 'personal', 'quien cuida', 'cuidan a los ninos', 'animador', 'animadora', 'animacion', 'show', 'payaso'],
      r: A('Las monitoras están para el cuidado de las instalaciones: se aseguran de que los niños no entren con comida, bebidas ni calzado a la zona de juegos, reciben a tus invitados y verifican que estacionen bien. Los niños siempre deben estar a cargo de un adulto. Si quieres animación o show, puedes coordinarlo como servicio externo.') },
    { id: 'h_jardin', ctx: 'happy', q: 'Convenio jardines y colegios', k: [['jardin', 2], ['jardines', 2], ['jardin infantil', 2.5], ['colegio', 2], ['colegios', 2], ['curso', 2], ['cursos', 2], ['kinder', 2], ['escuela', 2], ['actividad educativa', 2.5], ['organizacion social', 2], ['proyecto social', 2], ['programa municipal', 2], 'convenio para jardines', 'convenio colegio'],
      r: A('Convenio para jardines infantiles, colegios y eventos especiales: $250.000 por 3 horas de uso exclusivo del salón, hasta 90 personas, con hora adicional a $50.000. También hay precios preferentes para programas de protección y desarrollo infantil y proyectos sociales municipales.', null, [['/happy/#convenios', 'Ver convenios'], ['wa', 'Cotizar convenio', 'Hola ARVI HAPPY, quiero información sobre convenios para jardines o colegios', WA_HAPPY]], { ctx: 'happy' }) },
    { id: 'convenio', q: 'Convenio funcionarios', k: ['convenio', 'funcionario', 'funcionaria', 'funcionarios municipales', 'trabajo en la municipalidad', 'beneficio', 'convenio municipal', 'gubernamental'],
      r: A('Convenio especial ARVI Happy para funcionarios municipales y gubernamentales: $150.000, con atención preferente y coordinación ágil.', ['Lunes a jueves: 12:00 a 15:00 o 16:00 a 19:00', 'Viernes a domingo: 12:00 a 15:00 (coordinación previa)', 'Reserva sujeta a disponibilidad'], [[PDF.conv, 'Descargar convenio'], ['wa', 'Reservar con convenio', 'Hola ARVI HAPPY, soy funcionario municipal y quiero reservar con el convenio', WA_HAPPY]], { ctx: 'happy', after: 'Para municipios también tenemos un convenio de juegos sustentables.' }) },
    { id: 'h_contacto', ctx: 'happy', q: 'Contacto ARVI Happy', k: ['contacto', 'telefono', 'fono', 'correo', 'mail', 'email', 'llamar', 'whatsapp', 'instagram', 'ventas'],
      r: A('Contacto ARVI Happy:', ['WhatsApp: ' + C.waHappy, 'Teléfono fijo: ' + C.fijo, 'Correo: ' + C.mailHappy, 'Instagram: @arvihappy', 'Dirección: ' + C.happyDir + ' (cerca del Metro Observatorio)'], [['wa', 'Escribir por WhatsApp', 'Hola ARVI HAPPY, tengo una consulta', WA_HAPPY], ['/happy/', 'Ver página de ARVI Happy']]) },
    /* ---------- contacto general ---------- */
    { id: 'contacto', q: 'Horarios y contacto', k: [['whatsapp', 1.5], 'numero de whatsapp', 'contacto', 'contactar', 'telefono', 'telefonos', 'fono', 'numero', 'celular', 'correo', 'mail', 'email', 'llamar', 'horario de atencion', 'horario', ['atienden', 0.8], 'oficina', 'direccion', 'donde estan', 'donde se ubican', 'ubicacion'],
      r: A('Atendemos ' + C.horario + '.', ['WhatsApp: ' + C.wa, 'Teléfonos: ' + C.tel2 + ' · ' + C.fijo, 'Correo: ' + C.mail + ' · ' + C.mail2, 'Llevamos los juegos a tu evento en todo Chile; nuestro salón ARVI Happy está en ' + C.happyDir], [['wa', 'Escribir por WhatsApp', 'Hola ARVI, tengo una consulta'], ['tel:+56988082320', 'Llamar']]) },
    { id: 'redes', q: 'Redes sociales', k: ['instagram', 'redes', 'redes sociales', 'reels', 'tiktok', 'facebook', 'pagina', 'seguirlos', 'ig'],
      r: A('Síguenos en Instagram: @arvi.cl para juegos, eventos y el Verano 2027, y @arvihappy para cumpleaños.', null, [['https://www.instagram.com/arvi.cl/', '@arvi.cl'], ['https://www.instagram.com/arvihappy/', '@arvihappy'], ['#redes', 'Ver publicaciones']]) },
    { id: 'descargas', q: 'Catálogos y descargas', k: ['catalogo', 'pdf', 'descargar', 'descarga', 'brochure', 'ficha tecnica', 'fichas tecnicas', 'folleto', 'presentacion', 'informacion completa', 'documento'],
      r: A('Revisa el catálogo completo de juegos en arvi.cl/catalogo, y puedes descargar:', ['Convenio y proyectos sustentables para municipalidades', 'Información de ARVI Happy', 'Convenio ARVI Happy para funcionarios municipales', 'Propuesta ARVI Seguro'], [[PDF.muni, 'Municipalidades'], [PDF.happy, 'ARVI Happy'], [PDF.conv, 'Convenio funcionarios'], [PDF.seguro, 'ARVI Seguro'], ['/catalogo/', 'Catálogo de juegos (web)']]) },
    /* ---------- conversación ---------- */
    { id: 'humano', q: 'Hablar con una persona', k: [['hablar con una persona', 3], ['con una persona', 2.5], 'humano', 'ejecutivo', 'ejecutiva', 'alguien', 'atencion personal', 'hablar con alguien', 'operadora', 'vendedor', 'ventas', 'asesor', 'no me sirve', 'no entiendes', 'no me ayudas'],
      r: A('¡Claro! Te dejo con el equipo por WhatsApp; te responden en horario de atención (' + C.horario + ').', null, [['wa', 'Hablar con una persona', 'Hola ARVI, quiero hablar con una persona']]) },
    { id: 'quien', st: true, q: '¿Quién eres?', k: ['quien eres', 'eres un bot', 'eres real', 'eres humano', 'robot', 'inteligencia artificial', 'como te llamas', 'tu nombre'],
      r: A('Soy el Zorro ARVI 🦊, el asistente virtual de ARVI. Respondo al instante las preguntas frecuentes sobre juegos, arriendos, ARVI Happy y más. Si necesitas algo que no sé, te paso con el equipo por WhatsApp.') },
    { id: 'gracias', st: true, q: 'Gracias', k: ['gracias', 'muchas gracias', 'genial', 'perfecto', 'buenisimo', 'excelente', 'super', 'bacan', 'ok gracias', 'listo', 'vale', 'ok', 'okey', 'oka', 'dale', 'entiendo', 'entendido'],
      r: A('¡De nada! 🦊 ¿Te ayudo con algo más? Si quieres cotizar, te dejo el WhatsApp a mano.', null, [['wa', 'Cotizar por WhatsApp', 'Hola ARVI, quiero cotizar']]) },
    { id: 'chao', st: true, q: 'Chao', k: ['chao', 'adios', 'hasta luego', 'nos vemos', 'bye', 'chaito'],
      r: A('¡Gracias por escribirnos! Que tengas un día muy entretenido. 🎡') },
    { id: 'saludo', st: true, q: 'Hola', k: ['hola', 'holi', 'holaa', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'alo', 'hey', 'saludos'],
      r: A('¡Hola! 🦊 Soy el Zorro ARVI. ¿En qué te ayudo? Puedes preguntarme por juegos, precios, montaje, ARVI Happy, el Verano 2027 o cualquier duda de tu evento.') },
    { id: 'insulto', st: true, q: '', k: ['weon', 'weona', 'conchetumare', 'ctm', 'csm', 'mierda', 'idiota', 'estupido', 'tonto', 'culiao', 'aweonao'],
      r: A('Uf, parece que algo no salió bien. Si quieres, te dejo con el equipo por WhatsApp para que te ayuden directamente.', null, [['wa', 'Hablar con el equipo', 'Hola ARVI, necesito ayuda']]) }
  ];
  var IBYID = {}; INTENTS.forEach(function (i) { IBYID[i.id] = i; });
  // normaliza palabras clave y alias una sola vez
  function nk(w) { return norm(w).trim(); }
  INTENTS.forEach(function (i) { i.k = i.k.map(function (w) { return typeof w === 'string' ? nk(w) : [nk(w[0]), w[1]]; }); });
  for (var at in ATTR) ATTR[at] = ATTR[at].map(nk);
  RIDES.forEach(function (r) { r.a = r.a.map(nk); if (r.g) r.g = r.g.map(nk); });
  var HAPPY_WORDS_N = null;

  /* ======================= DETECCIÓN DE JUEGOS ======================= */
  function findRides(n, toks) {
    var best = [], bestLen = 0, generic = null;
    RIDES.forEach(function (r) {
      r.a.forEach(function (al) {
        var h = hit(n, al, toks);
        if (h >= 0.75 && (al.indexOf(' ') < 0 || h === 1 || al.split(' ').length > 1)) {
          var L = al.length * h;
          if (al.indexOf(' ') > -1 && h < 1) L = al.length * 0.7;
          if (L > bestLen + 0.01) { best = [r]; bestLen = L; } else if (Math.abs(L - bestLen) < 0.01 && best.indexOf(r) < 0) best.push(r);
        }
      });
    });
    if (!best.length) {
      // términos genéricos que aplican a varios juegos (carrusel, montaña rusa, tren, rueda…)
      RIDES.forEach(function (r) { (r.g || []).forEach(function (g) { if (n.indexOf(' ' + g) > -1 || fuzzyTok(g, toks)) { generic = generic || { term: g, list: [] }; if (generic.list.indexOf(r) < 0 && generic.term === g) generic.list.push(r); } }); });
      if (generic && generic.list.length === 1) return { one: generic.list[0] };
      if (generic) return { many: generic.list, term: generic.term };
      return {};
    }
    if (best.length === 1) return { one: best[0] };
    return { many: best };
  }
  function findAttr(n, toks) {
    var bestA = null, bs = 0;
    for (var a in ATTR) { var s = score(n, toks, ATTR[a]); if (s > bs) { bs = s; bestA = a; } }
    return bestA;
  }

  /* ======================= MOTOR ======================= */
  var HAPPY_WORDS = ['happy', 'cumpleanos', 'salon', 'fiesta infantil', 'arvihappy', 'cada nino', 'nino extra', 'ninos extra', 'nino adicional', 'ninos adicionales', 'decoracion'];
  function respond(text, st) {
    st = st || {};
    var n = norm(text), toks = n.trim().split(' ');
    var out = { msgs: [], chips: 'main', debug: {} };
    if (!n.trim()) return out;
    var happyHere = HAPPY_WORDS.some(function (w) { return n.indexOf(' ' + w) > -1 || fuzzyTok(w, toks); });
    var inHappy = happyHere || st.ctx === 'happy';

    // 1) puntajes de intenciones
    var scored = [];
    INTENTS.forEach(function (it) {
      if (it.ctx === 'happy' && !inHappy) return;
      var s = score(n, toks, it.k);
      if (!s) return;
      if (it.ctx === 'happy') s += 3;
      if (it.id === 'happy' && st.ctx === 'happy' && !happyHere) s -= 1;
      scored.push({ it: it, s: s });
    });
    // si pregunta algo específico de Happy, la ficha general de Happy cede el primer lugar
    if (scored.some(function (x) { return x.it.ctx === 'happy' && x.s - 2 >= 0.75; })) scored.forEach(function (x) { if (x.it.id === 'happy') x.s = 0.9; });
    scored.sort(function (a, b) { return b.s - a.s; });

    // 2) juegos mencionados
    var nr = n.replace(/ silla(s)? de ruedas/g, ' silla_ruedas').replace(/ (decoracion|decorar) (de|con) globos/g, ' decoracion'), tr = nr.trim().split(' ');
    var rf = happyHere ? {} : findRides(nr, tr);
    var attr = findAttr(n, toks);
    var ride = rf.one || null;
    var followUp = !ride && !rf.many && st.ride && attr && (toks.length <= 7 || /^ (y|e|el|la|ese|esa|este|esta|cuanto|cuantos|cuantas|que|necesita|requiere|tiene|mide|para) /.test(n));
    if (followUp && !(scored[0] && scored[0].s >= 2.6 && ['electricidad', 'espacio', 'montaje'].indexOf(scored[0].it.id) < 0)) ride = RBYID[st.ride];

    var top = scored[0];
    var content = scored.filter(function (x) { return !x.it.st; });
    var greet = scored.some(function (x) { return x.it.id === 'saludo'; });

    // 3) respuestas sobre un juego
    if (ride && !(inHappy && content[0] && content[0].it.ctx === 'happy')) {
      var strongOther = content[0] && content[0].s >= 3.2 && ['precio', 'electricidad', 'espacio', 'montaje', 'juegos', 'como_cotizar', 'incluye'].indexOf(content[0].it.id) < 0 && !followUp;
      if (attr === 'precio' || (content[0] && content[0].it.id === 'precio')) out.msgs.push(rideAttrAnswer(ride, 'precio'));
      else if (attr && attr !== 'precio') out.msgs.push(rideAttrAnswer(ride, attr));
      else out.msgs.push(rideCard(ride));
      if (strongOther) out.msgs.push(build(content[0].it));
      out.ride = ride.id; out.ctx = null; out.chips = 'ride';
      if (greet) out.msgs[0].p[0] = '¡Hola! ' + out.msgs[0].p[0];
      out.debug = { intent: 'ride:' + ride.id + (attr ? ':' + attr : ''), ride: ride.id };
      return out;
    }
    if (rf.many && !(content[0] && content[0].s >= 3 && content[0].it.ctx === 'happy')) {
      out.msgs.push({ p: ['Tenemos ' + rf.many.length + ' opciones' + (rf.term ? ' de "' + rf.term + '"' : '') + ':'], li: rf.many.map(function (r) { return r.n + ' — ' + short(r); }), after: '¿Cuál te interesa?', pick: rf.many.map(function (r) { return r.id; }) });
      out.debug = { intent: 'ambig:' + rf.many.map(function (r) { return r.id; }).join(',') };
      out.chips = 'pick'; out.pick = rf.many.map(function (r) { return r.id; });
      return out;
    }

    // 4) intenciones de contenido (hasta 2 si la pregunta trae varias)
    if (content.length && content[0].s >= 0.75) {
      var first = content[0];
      out.msgs.push(build(first.it));
      var second = content.filter(function (x) { return x.it.id !== first.it.id && x.s >= Math.max(1.6, first.s * 0.72) && !related(first.it.id, x.it.id); })[0];
      if (second) out.msgs.push(build(second.it));
      if (greet && out.msgs[0].p) out.msgs[0].p[0] = '¡Hola! ' + out.msgs[0].p[0];
      var ctx = (first.it.ctx === 'happy' || first.it.id === 'happy' || first.it.id === 'convenio' || (first.it.id === 'seguro')) ? 'happy' : (inHappy && !content.some(function (x) { return !x.it.ctx && x.s > first.s; }) && happyHere ? 'happy' : null);
      if (first.it.ctx !== 'happy' && first.it.id !== 'happy' && first.it.id !== 'convenio' && first.it.id !== 'seguro') ctx = null;
      out.ctx = ctx; out.ride = null; out.chips = ctx === 'happy' ? 'happy' : (first.it.id === 'verano' ? 'verano' : 'main');
      out.debug = { intent: first.it.id, second: second ? second.it.id : null };
      return out;
    }
    // 5) conversación (saludo, gracias…)
    if (top && top.it.st) {
      out.msgs.push(build(top.it)); out.ctx = st.ctx; out.ride = st.ride;
      out.chips = st.ctx === 'happy' ? 'happy' : 'main';
      out.debug = { intent: top.it.id };
      return out;
    }
    // 6) atributo suelto sin juego (ej. "¿cuánto mide?")
    if (attr && attr !== 'precio') {
      var map = { en: 'electricidad', med: 'espacio', mon: 'montaje', acc: 'espacio', cap: 'rec_masivo', fl: 'rec_masivo', est: 'juegos' };
      if (map[attr]) { out.msgs.push(build(IBYID[map[attr]])); out.debug = { intent: map[attr] }; out.chips = 'main'; return out; }
    }
    // 7) no entendí → sugerencias + WhatsApp con la pregunta
    out.msgs.push({ p: ['Mmm, esa no la tengo clara 🦊. Puede que te sirva alguna de estas opciones, o te dejo tu pregunta lista para enviarla al equipo por WhatsApp:'], acts: [['wa', 'Enviar mi pregunta al equipo', 'Hola ARVI, tengo una consulta: ' + text]] });
    out.chips = st.ctx === 'happy' ? 'happy' : 'main'; out.ctx = st.ctx; out.ride = st.ride;
    out.debug = { intent: 'fallback' };
    return out;
  }
  function related(a, b) {
    var groups = [['precio', 'como_cotizar'], ['incluye', 'montaje'], ['juegos', 'rec_peques', 'rec_grandes', 'rec_masivo', 'rec_sinluz', 'rec_verano'], ['sustentable', 'proyectos_muni', 'rec_sinluz'], ['b2b', 'proyectos_muni'], ['contacto', 'h_contacto', 'redes'], ['seguridad', 'empresa'], ['h_precio', 'h_ninos', 'h_capacidad', 'h_horario'], ['h_cocina', 'h_comida'], ['h_reserva', 'h_cancela'], ['happy', 'h_incluye'], ['inclusivo', 'seguro'], ['empresa', 'eventos']];
    return groups.some(function (g) { return g.indexOf(a) > -1 && g.indexOf(b) > -1; });
  }
  function build(it) { var r = typeof it.r === 'function' ? it.r() : it.r; return JSON.parse(JSON.stringify(r)); }

  var CHIPS = {
    main: ['precio', 'incluye', 'juegos', 'verano', 'happy', 'regiones', 'electricidad', 'espacio', 'montaje', 'sustentable', 'inclusivo', 'b2b', 'seguridad', 'contacto'],
    happy: ['h_precio', 'h_incluye', 'h_horario', 'h_donde', 'h_reserva', 'h_cancela', 'h_comida', 'h_deco', 'h_reglas', 'h_cocina', 'h_edad', 'h_jardin', 'convenio', 'h_contacto'],
    verano: ['verano', 'redes', 'juegos', 'contacto'],
    ride: [['cap', 'Capacidad'], ['mon', 'Montaje'], ['med', 'Medidas'], ['en', 'Energía'], ['est', 'Edad y estatura'], ['precio', 'Cotizar']]
  };

  var API = { respond: respond, norm: norm, RIDES: RIDES, INTENTS: INTENTS, CHIPS: CHIPS, IBYID: IBYID, RBYID: RBYID, rideCard: rideCard, rideAttrAnswer: rideAttrAnswer, build: build, waURL: waURL, WA_NUM: WA_NUM };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.ArviBot = API;

  /* ======================= INTERFAZ (solo navegador) ======================= */
  if (typeof document === 'undefined') return;
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    var chat = document.getElementById('chat'); if (!chat) return;
    var log = document.getElementById('chatLog'), quick = document.getElementById('chatQuick'), form = document.getElementById('chatForm'), inp = document.getElementById('chatIn'), fox = document.getElementById('foxBtn'), waFoot = document.getElementById('chatWa'), guide = document.getElementById('guide');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var state = { ctx: null, ride: null }, started = false;
    var I_WA = '<svg aria-hidden="true"><use href="#i-wa"/></svg>';
    function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function add(html, who) {
      var m = document.createElement('div'); m.className = 'msg ' + who; m.innerHTML = html; log.appendChild(m);
      // respuestas largas: mostrar desde el inicio del mensaje
      if (who === 'bot' && m.offsetHeight > log.clientHeight * 0.75) log.scrollTop = m.offsetTop - 12; else log.scrollTop = log.scrollHeight;
      return m;
    }
    function render(msg, q) {
      var h = (msg.p || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
      if (msg.li) h += '<ul>' + msg.li.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      if (msg.after) h += '<p>' + esc(msg.after) + '</p>';
      if (msg.acts && msg.acts.length) {
        h += '<div class="acts">' + msg.acts.map(function (a) {
          if (a[0] === 'wa') return '<a class="wa" href="' + waURL(a[2] || ('Hola ARVI, ' + q), a[3]) + '" target="_blank" rel="noopener">' + I_WA + esc(a[1]) + '</a>';
          var ext = /^(https?:|\/descargas|mailto:)/.test(a[0]), tel = a[0].indexOf('tel:') === 0;
          return '<a href="' + a[0] + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + (!ext && !tel ? ' data-close="1"' : '') + '>' + esc(a[1]) + '</a>';
        }).join('') + '</div>';
      }
      return h;
    }
    function reply(msgs, q, done) {
      var i = 0;
      (function next() {
        if (i >= msgs.length) { if (done) done(); return; }
        var ty = add('<i></i><i></i><i></i>', 'bot typing');
        setTimeout(function () { ty.remove(); add(render(msgs[i], q), 'bot'); i++; next(); }, reduce ? 0 : 420 + Math.min(500, (msgs[i].p || [''])[0].length * 3));
      })();
    }
    function setChips(set, pick) {
      quick.innerHTML = '';
      function btn(label, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', fn); quick.appendChild(b); }
      if (set === 'pick' && pick) { pick.forEach(function (id) { var r = RBYID[id]; btn(r.n, function () { say(r.n, function () { return { msgs: [rideCard(r)], ride: r.id, chips: 'ride' }; }); }); }); btn('← Otras preguntas', function () { setChips('main'); }); return; }
      if (set === 'ride' && state.ride) {
        var r = RBYID[state.ride];
        CHIPS.ride.forEach(function (c) { btn(c[1], function () { say(c[1] + ' · ' + r.n, function () { return { msgs: [rideAttrAnswer(r, c[0])], ride: r.id, chips: 'ride' }; }); }); });
        btn('← Otras preguntas', function () { state.ride = null; setChips('main'); }); return;
      }
      if (set === 'happy') btn('← Otras preguntas', function () { state.ctx = null; setChips('main'); });
      (CHIPS[set] || CHIPS.main).forEach(function (id) { var it = IBYID[id]; btn(it.q, function () { say(it.q, function () { var m = build(it); return { msgs: [m], ctx: (it.ctx === 'happy' || id === 'happy' || id === 'convenio' || id === 'seguro') ? 'happy' : (set === 'happy' ? 'happy' : null), chips: (it.ctx === 'happy' || id === 'happy' || set === 'happy') ? 'happy' : (id === 'verano' ? 'verano' : 'main') }; }); }); });
    }
    function say(text, forced) {
      text = (text || '').trim(); if (!text) return;
      add(esc(text), 'me');
      var res = forced ? forced() : respond(text, state);
      if (!forced) waFoot.href = waURL('Hola ARVI, tengo una consulta: ' + text);
      if ('ctx' in res) state.ctx = res.ctx;
      if ('ride' in res) state.ride = res.ride;
      reply(res.msgs, text, function () { setChips(res.chips || 'main', res.pick); });
    }
    function openChat() {
      chat.hidden = false; fox.setAttribute('aria-expanded', 'true');
      var bub = document.getElementById('bubble'); if (bub) bub.hidden = true;
      if (guide) guide.classList.remove('off');
      if (!started) {
        started = true;
        add(render({ p: ['¡Hola! Soy el Zorro ARVI 🦊 Te respondo al instante sobre juegos, precios, montaje, ARVI Happy, el Verano 2027 y más. Escríbeme como quieras o elige una opción.'] }), 'bot');
        setChips('main');
      }
      setTimeout(function () { if (window.matchMedia('(hover:hover)').matches) inp.focus(); }, 300);
    }
    function closeChat() { chat.hidden = true; fox.setAttribute('aria-expanded', 'false'); fox.focus(); window.dispatchEvent(new Event('scroll')); }
    fox.addEventListener('click', function () { if (chat.hidden) openChat(); else closeChat(); });
    document.getElementById('chatClose').addEventListener('click', closeChat);
    var ask = document.getElementById('bubbleAsk'); if (ask) ask.addEventListener('click', openChat);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !chat.hidden) closeChat(); });
    log.addEventListener('click', function (e) { var a = e.target.closest('a[data-close]'); if (a && window.matchMedia('(max-width:600px)').matches) closeChat(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); say(inp.value); inp.value = ''; });
    // abrir el asistente desde cualquier enlace con data-open-chat
    document.addEventListener('click', function (e) { var t = e.target.closest('[data-open-chat]'); if (t) { e.preventDefault(); openChat(); } });
  });
})(typeof window !== 'undefined' ? window : this);
