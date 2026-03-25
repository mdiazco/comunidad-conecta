// Checklists expertos por sistema técnico
export const EXPERT_CHECKLISTS = {
  ascensores: [
    { id: '1', title: 'Inspección de cabina', description: 'Revisar estado interior, piso, paredes, techo y acabados de la cabina' },
    { id: '2', title: 'Verificación de puertas', description: 'Funcionamiento, alineación, sensores de cierre y apertura automática' },
    { id: '3', title: 'Prueba de frenos', description: 'Verificar frenos de seguridad de parachute y freno de motor' },
    { id: '4', title: 'Inspección de cables de tracción', description: 'Estado, desgaste, tensión y lubricación de cables de acero' },
    { id: '5', title: 'Revisión panel de control', description: 'Inspeccionar tablero eléctrico, relés, contactores y programación' },
    { id: '6', title: 'Prueba de parada de emergencia', description: 'Verificar funcionamiento de dispositivos de seguridad y parada de emergencia' },
    { id: '7', title: 'Iluminación cabina y foso', description: 'Verificar luminarias, luz de emergencia y alumbrado de foso y sala de máquinas' },
    { id: '8', title: 'Alarma y comunicación', description: 'Probar alarma sonora, intercomunicador y comunicación de emergencia' },
    { id: '9', title: 'Limpieza de foso', description: 'Limpiar foso, eliminar residuos, verificar nivel de aceite y humedad' },
    { id: '10', title: 'Registro y documentación', description: 'Completar libro de mantención, actualizar certificado técnico y protocolo' },
  ],
  tableros_electricos: [
    { id: '1', title: 'Inspección visual tablero', description: 'Revisar estado físico, oxidación, humedad, etiquetado y señalización' },
    { id: '2', title: 'Verificación de conexiones', description: 'Apretar bornes, verificar conexiones flojas, temperatura con termómetro' },
    { id: '3', title: 'Medición de voltaje y corriente', description: 'Medir tensiones de fase, neutro y tierra; verificar corrientes de línea' },
    { id: '4', title: 'Limpieza interior', description: 'Eliminar polvo, residuos e insectos con aspiradora y soplador aislado' },
    { id: '5', title: 'Prueba de disyuntores', description: 'Verificar funcionamiento mecánico de interruptores y fusibles' },
    { id: '6', title: 'Señalización y puesta a tierra', description: 'Verificar identificación de circuitos, señalética de peligro y resistencia de tierra' },
    { id: '7', title: 'Control de temperatura', description: 'Medir temperatura interior con termómetro de contacto, ventilación adecuada' },
  ],
  estanque_agua: [
    { id: '1', title: 'Vaciado del estanque', description: 'Vaciar completamente el estanque siguiendo protocolo de corte de suministro' },
    { id: '2', title: 'Limpieza interior', description: 'Cepillar y limpiar paredes, piso y techo interior del estanque' },
    { id: '3', title: 'Desinfección con cloro', description: 'Aplicar solución de hipoclorito de sodio según norma NCh 409' },
    { id: '4', title: 'Inspección de válvulas', description: 'Verificar válvulas de entrada, salida, flotador y overflow' },
    { id: '5', title: 'Revisión de filtraciones', description: 'Inspeccionar paredes y uniones en busca de grietas o filtraciones' },
    { id: '6', title: 'Verificación de sellos y tapas', description: 'Comprobar hermeticidad de tapas, sellos sanitarios y protección contra vectores' },
    { id: '7', title: 'Registro sanitario', description: 'Completar registro sanitario, tomar muestra de agua si aplica' },
  ],
  red_agua: [
    { id: '1', title: 'Verificación de presión', description: 'Medir presión en puntos de la red con manómetro; verificar presión mínima de 0.5 kgf/cm²' },
    { id: '2', title: 'Inspección de fugas', description: 'Recorrido visual de cañerías visibles, medición nocturna para detectar consumo fantasma' },
    { id: '3', title: 'Revisión de cañerías', description: 'Verificar estado de cañerías, corrosión, soportes y aislación' },
    { id: '4', title: 'Prueba de válvulas de corte', description: 'Operar todas las válvulas de corte para verificar funcionamiento' },
    { id: '5', title: 'Lectura de remarcadores', description: 'Tomar lectura de todos los medidores y verificar consumo por unidad' },
  ],
  alcantarillado: [
    { id: '1', title: 'Inspección de cámaras', description: 'Abrir y revisar cámaras de inspección, verificar estado de paredes y fondo' },
    { id: '2', title: 'Limpieza de cañerías', description: 'Hidrolavado o desatascado de cañerías principales y secundarias' },
    { id: '3', title: 'Verificación de flujo', description: 'Comprobar escurrimiento libre, sin obstrucciones ni acumulaciones' },
    { id: '4', title: 'Control de olores', description: 'Verificar sellos hidráulicos en sifones, tapas herméticas y ventilaciones' },
    { id: '5', title: 'Estado de tapas y marcos', description: 'Verificar integridad de tapas, marcos y anillos de ajuste' },
  ],
  extintores: [
    { id: '1', title: 'Verificación de carga', description: 'Comprobar peso del extintor según tipo (polvo, CO2, agua) y comparar con etiqueta' },
    { id: '2', title: 'Control de manómetro', description: 'Verificar que la presión esté en zona verde del manómetro' },
    { id: '3', title: 'Estado físico externo', description: 'Inspeccionar golpes, abolladuras, corrosión, etiquetas y precinto de seguridad' },
    { id: '4', title: 'Verificación de vencimiento', description: 'Revisar fecha de próxima recarga, sello y certificado vigente' },
    { id: '5', title: 'Accesibilidad', description: 'Verificar que estén accesibles, sin obstáculos, a altura reglamentaria' },
    { id: '6', title: 'Señalización', description: 'Comprobar señalética visible, pictogramas reglamentarios y descripción de uso' },
  ],
  alarma_incendio: [
    { id: '1', title: 'Prueba de sensores', description: 'Activar muestra de detectores de humo e ionización para verificar respuesta' },
    { id: '2', title: 'Prueba de sirenas y estrobos', description: 'Verificar activación sonora y visual de sirenas y estrobos en todos los pisos' },
    { id: '3', title: 'Revisión del panel central', description: 'Verificar estado del panel, zonas, indicadores LED y memoria de alarmas' },
    { id: '4', title: 'Estado de baterías', description: 'Medir tensión de baterías de respaldo, verificar autonomía mínima de 4 horas' },
    { id: '5', title: 'Prueba de comunicación', description: 'Verificar enlace con central de monitoreo o protocolo de notificación' },
  ],
  red_humeda_seca: [
    { id: '1', title: 'Inspección de mangueras', description: 'Revisar estado de mangueras, gabinetes, enrolladores y pitones' },
    { id: '2', title: 'Prueba de presión', description: 'Verificar presión en puntos de la red contra incendio' },
    { id: '3', title: 'Revisión de válvulas', description: 'Comprobar válvulas siamesas, de paso y de prueba' },
    { id: '4', title: 'Prueba hidráulica', description: 'Realizar prueba de flujo y presión según normativa NFPA/NCh' },
    { id: '5', title: 'Estado de conexiones y racores', description: 'Verificar racores, adaptadores y compatibilidad con equipos del CBSF' },
  ],
  generador: [
    { id: '1', title: 'Prueba de encendido', description: 'Arrancar el generador y verificar encendido exitoso, sin ruidos anómalos' },
    { id: '2', title: 'Control de combustible', description: 'Verificar nivel de combustible, estado del filtro y ausencia de fugas' },
    { id: '3', title: 'Verificación de aceite', description: 'Medir nivel de aceite de motor, verificar calidad y cambiar si aplica' },
    { id: '4', title: 'Prueba bajo carga', description: 'Conectar carga simulada y verificar voltaje, frecuencia y temperatura de operación' },
    { id: '5', title: 'Prueba de transferencia', description: 'Simular corte de red y verificar tiempo y corrección de transferencia automática' },
    { id: '6', title: 'Estado de batería de arranque', description: 'Medir voltaje y densidad de batería de arranque; verificar bornes y carga' },
  ],
  iluminacion_emergencia: [
    { id: '1', title: 'Prueba de encendido por corte', description: 'Simular corte de energía y verificar activación automática de todas las luminarias' },
    { id: '2', title: 'Estado de baterías', description: 'Verificar carga y autonomía de baterías internas (mínimo 1 hora según norma)' },
    { id: '3', title: 'Estado de luminarias', description: 'Verificar integridad física, fijación, limpieza y orientación de luminarias' },
    { id: '4', title: 'Prueba de autonomía', description: 'Dejar en operación autónoma y medir tiempo de duración real' },
  ],
  cctv: [
    { id: '1', title: 'Verificación de cámaras', description: 'Revisar imagen en tiempo real de todas las cámaras, orientación y zoom' },
    { id: '2', title: 'Limpieza de lentes', description: 'Limpiar lentes con paño seco, verificar cúpulas y carcasas exteriores' },
    { id: '3', title: 'Sistema de grabación DVR/NVR', description: 'Verificar estado del disco, espacio disponible y configuración de sobreescritura' },
    { id: '4', title: 'Tiempo de almacenamiento', description: 'Comprobar días de grabación almacenada, verificar cumplimiento mínimo requerido' },
    { id: '5', title: 'Acceso y visualización remota', description: 'Verificar acceso remoto desde dispositivos autorizados' },
  ],
  citofonia: [
    { id: '1', title: 'Prueba de comunicación', description: 'Verificar audio bidireccional entre conserjería, paneles exteriores y unidades' },
    { id: '2', title: 'Estado del panel principal', description: 'Revisar teclado, display, botones y estado general del panel' },
    { id: '3', title: 'Calidad de audio', description: 'Verificar claridad de audio, sin interferencias ni cortes' },
    { id: '4', title: 'Revisión de cableado', description: 'Inspeccionar cableado visible, sin empalmes inseguros ni daños' },
  ],
  basura: [
    { id: '1', title: 'Limpieza general del cuarto', description: 'Limpiar paredes, piso y techo del cuarto de basura con detergente desinfectante' },
    { id: '2', title: 'Lavado de contenedores', description: 'Lavar y desinfectar todos los contenedores y tachos de basura' },
    { id: '3', title: 'Control de olores', description: 'Aplicar desodorizante, verificar ventilación y sellos de ductos de basura' },
    { id: '4', title: 'Verificación de drenaje', description: 'Comprobar funcionamiento del sumidero y ausencia de residuos sólidos en desagüe' },
    { id: '5', title: 'Estado de contenedores', description: 'Verificar integridad física de contenedores, tapas y sistemas de ruedas' },
  ],
  otro: [
    { id: '1', title: 'Inspección general', description: 'Realizar inspección visual completa del sistema' },
    { id: '2', title: 'Verificación de funcionamiento', description: 'Probar funcionamiento correcto de todos los componentes' },
    { id: '3', title: 'Registro y documentación', description: 'Documentar hallazgos y acciones realizadas' },
  ],
};

export const SYSTEM_LABELS = {
  ascensores: 'Ascensores',
  tableros_electricos: 'Tableros Eléctricos',
  estanque_agua: 'Estanque de Agua',
  red_agua: 'Red de Agua',
  alcantarillado: 'Alcantarillado',
  extintores: 'Extintores',
  alarma_incendio: 'Alarma de Incendio',
  red_humeda_seca: 'Red Húmeda/Seca',
  generador: 'Generador',
  iluminacion_emergencia: 'Iluminación Emergencia',
  cctv: 'CCTV',
  citofonia: 'Citofonía',
  basura: 'Basura',
  otro: 'Otro',
};

export const SYSTEM_ICONS = {
  ascensores: '🛗',
  tableros_electricos: '⚡',
  estanque_agua: '💧',
  red_agua: '🚰',
  alcantarillado: '🚽',
  extintores: '🔥',
  alarma_incendio: '🚨',
  red_humeda_seca: '💦',
  generador: '⚡',
  iluminacion_emergencia: '💡',
  cctv: '📹',
  citofonia: '📞',
  basura: '🗑️',
  otro: '🔧',
};

export const FREQ_LABELS = {
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  personalizada: 'Personalizada',
};

// Current year end date
export const getYearEndDate = (year = new Date().getFullYear()) => `${year}-12-31`;
export const getCurrentYear = () => new Date().getFullYear();