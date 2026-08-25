(function () {
  const STORAGE = {
    settings: "wrenchline.settings",
    conversations: "wrenchline.conversations",
    siteContent: "wrenchline.siteContent",
    session: "wrenchline.session",
    consent: "wrenchline.consent",
    language: "diagnostica.language",
  };

  const SUPPORTED_LANGUAGES = {
    en: { label: "English", htmlLang: "en", promptName: "English" },
    es: { label: "Español", htmlLang: "es", promptName: "Spanish" },
    ro: { label: "Română", htmlLang: "ro", promptName: "Romanian" },
    "ca-valencia": { label: "Valencià", htmlLang: "ca-ES-valencia", promptName: "Valencian" },
  };

  const TRANSLATIONS = {
    en: {
      "language.title": "Choose your language",
      "language.subtitle": "The diagnostic service and its replies will use this language.",
      "language.change": "Change language",
      "language.close": "Close language selection",
      "language.available": "Available languages",
      "account.loggedOut": "Logged out",
      "account.loggedIn": "Logged in",
      "nav.login": "Login",
      "nav.createAccount": "Create account",
      "nav.admin": "Admin dashboard",
      "nav.contact": "Contact us",
      "nav.legal": "Legal",
      "nav.signOut": "Sign out",
      "hero.promise": "Work through your car problem with evidence-led guidance",
      "hero.guided": "Guided diagnostics",
      "hero.carQuestions": "Car Questions",
      "hero.title": "Describe the symptom. Work the problem through.",
      "hero.description": "The diagnostic service asks for evidence, builds a test order, and interprets results. A specialist only enters the case when additional judgment is genuinely required.",
      "tabs.diagnostics": "Diagnostics",
      "tabs.savedCases": "Saved cases",
      "tabs.repairLibrary": "Repair library",
      "profile.stats": "Evidence-led vehicle diagnostics",
      "profile.experience": "Human review is requested only when genuinely needed",
      "plan.defaultUsage": "10 diagnostic messages daily",
      "plan.goPremium": "Go Premium",
      "plan.manageBilling": "Manage billing",
      "plan.disabled": "Account disabled",
      "plan.unlimited": "Unlimited diagnostic messages",
      "plan.usage": "{used} of {limit} diagnostic messages used today",
      "cases.savedTitle": "Saved diagnostic cases",
      "cases.newCase": "New case",
      "cases.empty": "No saved cases yet. Create a structured case to start diagnosing.",
      "chat.questionLabel": "Type your car question",
      "chat.placeholder": "Type your car question here...",
      "chat.reviewPlaceholder": "Add information for the human reviewer...",
      "chat.available": "Diagnostic guidance available now",
      "chat.reviewQueue": "This case is in the human review queue",
      "chat.start": "Start chat",
      "chat.sendUpdate": "Send update",
      "chat.welcome": "Tell me the year, make, model, mileage, symptoms, warning lights, sounds, smells, and when the issue happens. We will work through the diagnosis step by step.",
      "chat.typing": "Reviewing the symptoms and test history...",
      "case.setupMessage": "Case saved. Add the first question, observation, or test result and the diagnostic service will build a test plan.",
      "chat.emptyLoggedIn": "Create or open a saved case to start guided diagnostics.",
      "chat.emptyLoggedOut": "Log in to create a saved case and begin guided diagnostics.",
      "quick.checkEngine": "Check engine",
      "quick.checkEnginePrompt": "My check engine light is on and the car feels rough at idle.",
      "quick.grindingBrakes": "Grinding brakes",
      "quick.grindingBrakesPrompt": "My brakes are grinding when I slow down.",
      "quick.noStart": "No start",
      "quick.noStartPrompt": "The car will not start, but the lights still come on.",
      "quick.overheating": "Overheating",
      "quick.overheatingPrompt": "The engine temperature is climbing and I smell coolant.",
      "review.required": "Human review required",
      "review.text": "Text review",
      "review.video": "Video",
      "review.voice": "Voice",
      "review.duration": "Duration",
      "review.preferredTime": "Preferred time",
      "review.reserve": "Reserve mechanic",
      "review.reserveSpecialist": "Reserve specialist",
      "review.textQueued": "Text review queued",
      "common.free": "Free",
      "common.optional": "Optional",
      "common.other": "Other",
      "common.cancel": "Cancel",
      "common.unknown": "Unknown",
      "common.notSupplied": "Not supplied",
      "common.noneSupplied": "None supplied",
      "common.pending": "Pending",
      "common.saved": "Saved",
      "common.you": "You",
      "common.caseSetup": "Case setup",
      "common.viewTool": "View tool",
      "common.join": "Join",
      "case.details": "Case details",
      "case.draft": "Draft",
      "sessions.title": "Live sessions",
      "uploads.title": "Files and scan reports",
      "uploads.copy": "Images, PDF reports, TXT/CSV logs, OBD/VCDS/ODIS scans, and ECU binaries up to 25 MB.",
      "uploads.select": "Select file",
      "uploads.upload": "Upload",
      "uploads.empty": "No files uploaded to this case.",
      "uploads.success": "File uploaded and linked to this case.",
      "tools.title": "Recommended tools",
      "tools.copy": "Recommendations are rule-based and may contain affiliate links.",
      "tools.empty": "No tool rules match this case yet.",
      "tools.relevant": "Relevant diagnostic tool",
      "consent.title": "Cookie and ad consent",
      "consent.body": "We use essential storage for login and saved cases. With your consent, we also use ads to keep free text help available.",
      "consent.legal": "Legal and privacy",
      "consent.essential": "Essential only",
      "consent.accept": "Accept ads",
      "caseForm.kicker": "Structured diagnostic session",
      "caseForm.title": "New diagnostic case",
      "caseForm.caseTitle": "Case title",
      "caseForm.caseTitlePlaceholder": "Intermittent no-start after warm-up",
      "caseForm.symptoms": "Symptoms",
      "caseForm.dtcCodes": "DTC fault codes",
      "caseForm.dtcHint": "Separate with commas or spaces",
      "caseForm.previousWork": "Previous repairs or tests",
      "caseForm.create": "Create saved case",
      "caseForm.saving": "Saving the diagnostic case...",
      "vehicle.year": "Year",
      "vehicle.make": "Make",
      "vehicle.model": "Model",
      "vehicle.engine": "Engine / powertrain",
      "vehicle.fuelType": "Fuel type",
      "vehicle.fuel": "Fuel",
      "vehicle.gearbox": "Gearbox",
      "vehicle.ecu": "ECU identifier",
      "vehicle.dtcCodes": "DTC codes",
      "vehicle.priority": "Priority",
      "vehicle.mileage": "Mileage",
      "vehicle.area": "Area",
      "vehicle.brief": "Brief",
      "fuel.petrol": "Petrol",
      "fuel.diesel": "Diesel",
      "fuel.hybrid": "Hybrid",
      "fuel.electric": "Electric",
      "gearbox.manual": "Manual",
      "gearbox.automatic": "Automatic",
      "gearbox.singleSpeed": "Single-speed EV",
      "auth.kicker": "Secure account",
      "auth.email": "Email or admin username",
      "auth.password": "Password",
      "auth.existing": "Use existing login",
      "auth.loggingIn": "Logging in...",
      "auth.creating": "Creating account...",
      "auth.verify": "Check your email for the verification link, then log in.",
      "auth.forgot": "Forgot password?",
      "auth.resetSending": "Sending a secure reset link...",
      "duration.minutes": "{minutes} minutes",
      "duration.hour": "1 hour",
      "duration.hours": "{hours} hours",
      "duration.30": "30 minutes",
      "duration.60": "1 hour",
      "duration.90": "90 minutes",
      "duration.120": "2 hours",
      "status.active": "Active",
      "status.waiting_for_mechanic": "Human review",
      "status.assigned": "Assigned",
      "status.resolved": "Resolved",
      "status.archived": "Archived",
      "ad.label": "Advertisement",
    },
    es: {
      "language.title": "Elige tu idioma",
      "language.subtitle": "El servicio de diagnóstico y sus respuestas usarán este idioma.",
      "language.change": "Cambiar idioma",
      "language.close": "Cerrar selección de idioma",
      "language.available": "Idiomas disponibles",
      "account.loggedOut": "Sesión cerrada",
      "account.loggedIn": "Sesión iniciada",
      "nav.login": "Iniciar sesión",
      "nav.createAccount": "Crear cuenta",
      "nav.admin": "Panel de administración",
      "nav.contact": "Contacto",
      "nav.legal": "Legal",
      "nav.signOut": "Cerrar sesión",
      "hero.promise": "Resuelve el problema de tu coche con orientación basada en pruebas",
      "hero.guided": "Diagnóstico guiado",
      "hero.carQuestions": "Consultas del coche",
      "hero.title": "Describe el síntoma. Resuelve el problema paso a paso.",
      "hero.description": "El servicio pide pruebas, crea un orden de comprobaciones e interpreta los resultados. Solo interviene un especialista cuando hace falta criterio adicional.",
      "tabs.diagnostics": "Diagnóstico",
      "tabs.savedCases": "Casos guardados",
      "tabs.repairLibrary": "Biblioteca de reparación",
      "profile.stats": "Diagnóstico del vehículo basado en pruebas",
      "profile.experience": "Solo se solicita revisión humana cuando es realmente necesaria",
      "plan.defaultUsage": "10 mensajes de diagnóstico al día",
      "plan.goPremium": "Pasar a Premium",
      "plan.manageBilling": "Gestionar suscripción",
      "plan.disabled": "Cuenta desactivada",
      "plan.unlimited": "Mensajes de diagnóstico ilimitados",
      "plan.usage": "{used} de {limit} mensajes de diagnóstico usados hoy",
      "cases.savedTitle": "Casos de diagnóstico guardados",
      "cases.newCase": "Nuevo caso",
      "cases.empty": "Todavía no hay casos guardados. Crea un caso para empezar el diagnóstico.",
      "chat.questionLabel": "Escribe tu consulta sobre el coche",
      "chat.placeholder": "Escribe aquí tu consulta sobre el coche...",
      "chat.reviewPlaceholder": "Añade información para la revisión humana...",
      "chat.available": "Orientación de diagnóstico disponible ahora",
      "chat.reviewQueue": "Este caso está en la cola de revisión humana",
      "chat.start": "Iniciar diagnóstico",
      "chat.sendUpdate": "Enviar actualización",
      "chat.welcome": "Indícame el año, marca, modelo, kilometraje, síntomas, testigos, sonidos, olores y cuándo ocurre el fallo. Resolveremos el diagnóstico paso a paso.",
      "chat.typing": "Revisando los síntomas y el historial de pruebas...",
      "case.setupMessage": "Caso guardado. Añade la primera pregunta, observación o resultado de una prueba y el servicio creará un plan de diagnóstico.",
      "chat.emptyLoggedIn": "Crea o abre un caso guardado para iniciar el diagnóstico guiado.",
      "chat.emptyLoggedOut": "Inicia sesión para crear un caso y comenzar el diagnóstico guiado.",
      "quick.checkEngine": "Testigo de motor",
      "quick.checkEnginePrompt": "El testigo del motor está encendido y el coche funciona irregular al ralentí.",
      "quick.grindingBrakes": "Frenos rozando",
      "quick.grindingBrakesPrompt": "Los frenos hacen un ruido de rozamiento al reducir la velocidad.",
      "quick.noStart": "No arranca",
      "quick.noStartPrompt": "El coche no arranca, pero las luces sí se encienden.",
      "quick.overheating": "Sobrecalentamiento",
      "quick.overheatingPrompt": "La temperatura del motor sube y huele a refrigerante.",
      "review.required": "Se requiere revisión humana",
      "review.text": "Revisión por texto",
      "review.video": "Vídeo",
      "review.voice": "Voz",
      "review.duration": "Duración",
      "review.preferredTime": "Hora preferida",
      "review.reserve": "Reservar mecánico",
      "review.reserveSpecialist": "Reservar especialista",
      "review.textQueued": "Revisión por texto en cola",
      "common.free": "Gratis",
      "common.optional": "Opcional",
      "common.other": "Otro",
      "common.cancel": "Cancelar",
      "common.unknown": "Desconocido",
      "common.notSupplied": "No indicado",
      "common.noneSupplied": "Ninguno indicado",
      "common.pending": "Pendiente",
      "common.saved": "Guardado",
      "common.you": "Tú",
      "common.caseSetup": "Configuración del caso",
      "common.viewTool": "Ver herramienta",
      "common.join": "Entrar",
      "case.details": "Detalles del caso",
      "case.draft": "Borrador",
      "sessions.title": "Sesiones en directo",
      "uploads.title": "Archivos e informes de escaneo",
      "uploads.copy": "Imágenes, informes PDF, registros TXT/CSV, escaneos OBD/VCDS/ODIS y binarios ECU de hasta 25 MB.",
      "uploads.select": "Seleccionar archivo",
      "uploads.upload": "Subir",
      "uploads.empty": "No hay archivos subidos en este caso.",
      "uploads.success": "Archivo subido y vinculado a este caso.",
      "tools.title": "Herramientas recomendadas",
      "tools.copy": "Las recomendaciones se basan en reglas y pueden contener enlaces de afiliado.",
      "tools.empty": "Todavía no hay herramientas que coincidan con este caso.",
      "tools.relevant": "Herramienta de diagnóstico relevante",
      "consent.title": "Consentimiento de cookies y anuncios",
      "consent.body": "Usamos almacenamiento esencial para el inicio de sesión y los casos guardados. Con tu consentimiento también usamos anuncios para mantener gratuita la ayuda por texto.",
      "consent.legal": "Legal y privacidad",
      "consent.essential": "Solo esenciales",
      "consent.accept": "Aceptar anuncios",
      "caseForm.kicker": "Sesión de diagnóstico estructurada",
      "caseForm.title": "Nuevo caso de diagnóstico",
      "caseForm.caseTitle": "Título del caso",
      "caseForm.caseTitlePlaceholder": "Fallo de arranque intermitente en caliente",
      "caseForm.symptoms": "Síntomas",
      "caseForm.dtcCodes": "Códigos de avería DTC",
      "caseForm.dtcHint": "Sepáralos con comas o espacios",
      "caseForm.previousWork": "Reparaciones o pruebas anteriores",
      "caseForm.create": "Crear caso guardado",
      "caseForm.saving": "Guardando el caso de diagnóstico...",
      "vehicle.year": "Año",
      "vehicle.make": "Marca",
      "vehicle.model": "Modelo",
      "vehicle.engine": "Motor / sistema de propulsión",
      "vehicle.fuelType": "Tipo de combustible",
      "vehicle.fuel": "Combustible",
      "vehicle.gearbox": "Cambio",
      "vehicle.ecu": "Identificador ECU",
      "vehicle.dtcCodes": "Códigos DTC",
      "vehicle.priority": "Prioridad",
      "vehicle.mileage": "Kilometraje",
      "vehicle.area": "Área",
      "vehicle.brief": "Resumen",
      "fuel.petrol": "Gasolina",
      "fuel.diesel": "Diésel",
      "fuel.hybrid": "Híbrido",
      "fuel.electric": "Eléctrico",
      "gearbox.manual": "Manual",
      "gearbox.automatic": "Automático",
      "gearbox.singleSpeed": "EV de una velocidad",
      "auth.kicker": "Cuenta segura",
      "auth.email": "Correo o usuario administrador",
      "auth.password": "Contraseña",
      "auth.existing": "Usar un inicio de sesión existente",
      "auth.loggingIn": "Iniciando sesión...",
      "auth.creating": "Creando cuenta...",
      "auth.verify": "Revisa tu correo para verificar la cuenta y después inicia sesión.",
      "auth.forgot": "¿Has olvidado la contraseña?",
      "auth.resetSending": "Enviando un enlace seguro...",
      "duration.minutes": "{minutes} minutos",
      "duration.hour": "1 hora",
      "duration.hours": "{hours} horas",
      "duration.30": "30 minutos",
      "duration.60": "1 hora",
      "duration.90": "90 minutos",
      "duration.120": "2 horas",
      "status.active": "Activo",
      "status.waiting_for_mechanic": "Revisión humana",
      "status.assigned": "Asignado",
      "status.resolved": "Resuelto",
      "status.archived": "Archivado",
      "ad.label": "Publicidad",
    },
    ro: {
      "language.title": "Alege limba",
      "language.subtitle": "Serviciul de diagnostic și răspunsurile sale vor folosi această limbă.",
      "language.change": "Schimbă limba",
      "language.close": "Închide selectarea limbii",
      "language.available": "Limbi disponibile",
      "account.loggedOut": "Deconectat",
      "account.loggedIn": "Conectat",
      "nav.login": "Autentificare",
      "nav.createAccount": "Creează cont",
      "nav.admin": "Panou de administrare",
      "nav.contact": "Contact",
      "nav.legal": "Informații legale",
      "nav.signOut": "Deconectare",
      "hero.promise": "Rezolvă problema mașinii cu îndrumare bazată pe dovezi",
      "hero.guided": "Diagnostic ghidat",
      "hero.carQuestions": "Întrebări auto",
      "hero.title": "Descrie simptomul. Rezolvă problema pas cu pas.",
      "hero.description": "Serviciul solicită dovezi, construiește ordinea testelor și interpretează rezultatele. Un specialist intervine doar când este necesară o evaluare suplimentară.",
      "tabs.diagnostics": "Diagnostic",
      "tabs.savedCases": "Cazuri salvate",
      "tabs.repairLibrary": "Bibliotecă de reparații",
      "profile.stats": "Diagnostic auto bazat pe dovezi",
      "profile.experience": "Evaluarea umană este solicitată doar când este cu adevărat necesară",
      "plan.defaultUsage": "10 mesaje de diagnostic pe zi",
      "plan.goPremium": "Treci la Premium",
      "plan.manageBilling": "Gestionează abonamentul",
      "plan.disabled": "Cont dezactivat",
      "plan.unlimited": "Mesaje de diagnostic nelimitate",
      "plan.usage": "{used} din {limit} mesaje de diagnostic folosite astăzi",
      "cases.savedTitle": "Cazuri de diagnostic salvate",
      "cases.newCase": "Caz nou",
      "cases.empty": "Nu există cazuri salvate. Creează un caz pentru a începe diagnosticul.",
      "chat.questionLabel": "Scrie întrebarea despre mașină",
      "chat.placeholder": "Scrie aici întrebarea despre mașină...",
      "chat.reviewPlaceholder": "Adaugă informații pentru evaluarea umană...",
      "chat.available": "Îndrumare pentru diagnostic disponibilă acum",
      "chat.reviewQueue": "Acest caz este în coada pentru evaluare umană",
      "chat.start": "Începe diagnosticul",
      "chat.sendUpdate": "Trimite actualizarea",
      "chat.welcome": "Spune-mi anul, marca, modelul, kilometrajul, simptomele, martorii, sunetele, mirosurile și când apare problema. Vom parcurge diagnosticul pas cu pas.",
      "chat.typing": "Se analizează simptomele și istoricul testelor...",
      "case.setupMessage": "Caz salvat. Adaugă prima întrebare, observație sau rezultat al unui test, iar serviciul va construi un plan de diagnostic.",
      "chat.emptyLoggedIn": "Creează sau deschide un caz salvat pentru a începe diagnosticul ghidat.",
      "chat.emptyLoggedOut": "Autentifică-te pentru a crea un caz și a începe diagnosticul ghidat.",
      "quick.checkEngine": "Martor motor",
      "quick.checkEnginePrompt": "Martorul motor este aprins, iar mașina funcționează neregulat la ralanti.",
      "quick.grindingBrakes": "Frâne zgomotoase",
      "quick.grindingBrakesPrompt": "Frânele scot un zgomot de frecare când încetinesc.",
      "quick.noStart": "Nu pornește",
      "quick.noStartPrompt": "Mașina nu pornește, dar luminile se aprind.",
      "quick.overheating": "Supraîncălzire",
      "quick.overheatingPrompt": "Temperatura motorului crește și simt miros de lichid de răcire.",
      "review.required": "Este necesară evaluarea umană",
      "review.text": "Evaluare prin text",
      "review.video": "Video",
      "review.voice": "Voce",
      "review.duration": "Durată",
      "review.preferredTime": "Ora preferată",
      "review.reserve": "Rezervă mecanic",
      "review.reserveSpecialist": "Rezervă specialist",
      "review.textQueued": "Evaluare prin text în așteptare",
      "common.free": "Gratuit",
      "common.optional": "Opțional",
      "common.other": "Altul",
      "common.cancel": "Anulează",
      "common.unknown": "Necunoscut",
      "common.notSupplied": "Nespecificat",
      "common.noneSupplied": "Niciunul specificat",
      "common.pending": "În așteptare",
      "common.saved": "Salvat",
      "common.you": "Tu",
      "common.caseSetup": "Configurarea cazului",
      "common.viewTool": "Vezi unealta",
      "common.join": "Intră",
      "case.details": "Detaliile cazului",
      "case.draft": "Ciornă",
      "sessions.title": "Sesiuni live",
      "uploads.title": "Fișiere și rapoarte de scanare",
      "uploads.copy": "Imagini, rapoarte PDF, jurnale TXT/CSV, scanări OBD/VCDS/ODIS și fișiere ECU de până la 25 MB.",
      "uploads.select": "Selectează fișier",
      "uploads.upload": "Încarcă",
      "uploads.empty": "Nu există fișiere încărcate în acest caz.",
      "uploads.success": "Fișier încărcat și asociat acestui caz.",
      "tools.title": "Unelte recomandate",
      "tools.copy": "Recomandările se bazează pe reguli și pot conține linkuri afiliate.",
      "tools.empty": "Nicio unealtă nu corespunde încă acestui caz.",
      "tools.relevant": "Unealtă de diagnostic relevantă",
      "consent.title": "Consimțământ pentru cookie-uri și reclame",
      "consent.body": "Folosim stocare esențială pentru autentificare și cazurile salvate. Cu acordul tău folosim și reclame pentru a păstra gratuit ajutorul prin text.",
      "consent.legal": "Informații legale și confidențialitate",
      "consent.essential": "Doar esențiale",
      "consent.accept": "Acceptă reclamele",
      "caseForm.kicker": "Sesiune de diagnostic structurată",
      "caseForm.title": "Caz nou de diagnostic",
      "caseForm.caseTitle": "Titlul cazului",
      "caseForm.caseTitlePlaceholder": "Pornire intermitentă dificilă la cald",
      "caseForm.symptoms": "Simptome",
      "caseForm.dtcCodes": "Coduri de eroare DTC",
      "caseForm.dtcHint": "Separă-le prin virgulă sau spațiu",
      "caseForm.previousWork": "Reparații sau teste efectuate",
      "caseForm.create": "Creează cazul salvat",
      "caseForm.saving": "Se salvează cazul de diagnostic...",
      "vehicle.year": "An",
      "vehicle.make": "Marcă",
      "vehicle.model": "Model",
      "vehicle.engine": "Motor / grup motopropulsor",
      "vehicle.fuelType": "Tip combustibil",
      "vehicle.fuel": "Combustibil",
      "vehicle.gearbox": "Cutie de viteze",
      "vehicle.ecu": "Identificator ECU",
      "vehicle.dtcCodes": "Coduri DTC",
      "vehicle.priority": "Prioritate",
      "vehicle.mileage": "Kilometraj",
      "vehicle.area": "Categorie",
      "vehicle.brief": "Rezumat",
      "fuel.petrol": "Benzină",
      "fuel.diesel": "Motorină",
      "fuel.hybrid": "Hibrid",
      "fuel.electric": "Electric",
      "gearbox.manual": "Manuală",
      "gearbox.automatic": "Automată",
      "gearbox.singleSpeed": "EV cu o treaptă",
      "auth.kicker": "Cont securizat",
      "auth.email": "E-mail sau utilizator administrator",
      "auth.password": "Parolă",
      "auth.existing": "Folosește autentificarea existentă",
      "auth.loggingIn": "Se autentifică...",
      "auth.creating": "Se creează contul...",
      "auth.verify": "Verifică e-mailul pentru confirmarea contului, apoi autentifică-te.",
      "auth.forgot": "Ai uitat parola?",
      "auth.resetSending": "Se trimite un link securizat...",
      "duration.minutes": "{minutes} minute",
      "duration.hour": "1 oră",
      "duration.hours": "{hours} ore",
      "duration.30": "30 de minute",
      "duration.60": "1 oră",
      "duration.90": "90 de minute",
      "duration.120": "2 ore",
      "status.active": "Activ",
      "status.waiting_for_mechanic": "Evaluare umană",
      "status.assigned": "Alocat",
      "status.resolved": "Rezolvat",
      "status.archived": "Arhivat",
      "ad.label": "Publicitate",
    },
    "ca-valencia": {
      "language.title": "Tria el teu idioma",
      "language.subtitle": "El servici de diagnòstic i les seues respostes usaran este idioma.",
      "language.change": "Canvia l'idioma",
      "language.close": "Tanca la selecció d'idioma",
      "language.available": "Idiomes disponibles",
      "account.loggedOut": "Sessió tancada",
      "account.loggedIn": "Sessió iniciada",
      "nav.login": "Inicia sessió",
      "nav.createAccount": "Crea un compte",
      "nav.admin": "Tauler d'administració",
      "nav.contact": "Contacte",
      "nav.legal": "Avís legal",
      "nav.signOut": "Tanca sessió",
      "hero.promise": "Resol el problema del cotxe amb orientació basada en proves",
      "hero.guided": "Diagnòstic guiat",
      "hero.carQuestions": "Consultes del cotxe",
      "hero.title": "Descriu el símptoma. Resol el problema pas a pas.",
      "hero.description": "El servici demana proves, crea un orde de comprovacions i interpreta els resultats. Només intervé un especialista quan realment cal un criteri addicional.",
      "tabs.diagnostics": "Diagnòstic",
      "tabs.savedCases": "Casos guardats",
      "tabs.repairLibrary": "Biblioteca de reparació",
      "profile.stats": "Diagnòstic del vehicle basat en proves",
      "profile.experience": "Només se sol·licita revisió humana quan és realment necessària",
      "plan.defaultUsage": "10 missatges de diagnòstic al dia",
      "plan.goPremium": "Passa a Premium",
      "plan.manageBilling": "Gestiona la subscripció",
      "plan.disabled": "Compte desactivat",
      "plan.unlimited": "Missatges de diagnòstic il·limitats",
      "plan.usage": "{used} de {limit} missatges de diagnòstic usats hui",
      "cases.savedTitle": "Casos de diagnòstic guardats",
      "cases.newCase": "Cas nou",
      "cases.empty": "Encara no hi ha casos guardats. Crea un cas per a començar el diagnòstic.",
      "chat.questionLabel": "Escriu la consulta sobre el cotxe",
      "chat.placeholder": "Escriu ací la consulta sobre el cotxe...",
      "chat.reviewPlaceholder": "Afig informació per a la revisió humana...",
      "chat.available": "Orientació de diagnòstic disponible ara",
      "chat.reviewQueue": "Este cas està en la cua de revisió humana",
      "chat.start": "Inicia el diagnòstic",
      "chat.sendUpdate": "Envia l'actualització",
      "chat.welcome": "Indica'm l'any, la marca, el model, el quilometratge, els símptomes, els testimonis, els sons, les olors i quan apareix la fallada. Farem el diagnòstic pas a pas.",
      "chat.typing": "S'estan revisant els símptomes i l'historial de proves...",
      "case.setupMessage": "Cas guardat. Afig la primera pregunta, observació o resultat d'una prova i el servici crearà un pla de diagnòstic.",
      "chat.emptyLoggedIn": "Crea o obri un cas guardat per a iniciar el diagnòstic guiat.",
      "chat.emptyLoggedOut": "Inicia sessió per a crear un cas i començar el diagnòstic guiat.",
      "quick.checkEngine": "Testimoni de motor",
      "quick.checkEnginePrompt": "El testimoni del motor està encés i el cotxe funciona irregularment al ralentí.",
      "quick.grindingBrakes": "Frens fregant",
      "quick.grindingBrakesPrompt": "Els frens fan un soroll de fregament quan reduïsc la velocitat.",
      "quick.noStart": "No arranca",
      "quick.noStartPrompt": "El cotxe no arranca, però els llums sí que s'encenen.",
      "quick.overheating": "Sobrecalfament",
      "quick.overheatingPrompt": "La temperatura del motor puja i fa olor de refrigerant.",
      "review.required": "Cal revisió humana",
      "review.text": "Revisió per text",
      "review.video": "Vídeo",
      "review.voice": "Veu",
      "review.duration": "Duració",
      "review.preferredTime": "Hora preferida",
      "review.reserve": "Reserva mecànic",
      "review.reserveSpecialist": "Reserva especialista",
      "review.textQueued": "Revisió per text en cua",
      "common.free": "Gratis",
      "common.optional": "Opcional",
      "common.other": "Altre",
      "common.cancel": "Cancel·la",
      "common.unknown": "Desconegut",
      "common.notSupplied": "No indicat",
      "common.noneSupplied": "Cap indicat",
      "common.pending": "Pendent",
      "common.saved": "Guardat",
      "common.you": "Tu",
      "common.caseSetup": "Configuració del cas",
      "common.viewTool": "Mostra l'eina",
      "common.join": "Entra",
      "case.details": "Detalls del cas",
      "case.draft": "Esborrany",
      "sessions.title": "Sessions en directe",
      "uploads.title": "Fitxers i informes d'escaneig",
      "uploads.copy": "Imatges, informes PDF, registres TXT/CSV, escanejos OBD/VCDS/ODIS i binaris ECU de fins a 25 MB.",
      "uploads.select": "Selecciona un fitxer",
      "uploads.upload": "Puja",
      "uploads.empty": "No hi ha fitxers pujats en este cas.",
      "uploads.success": "Fitxer pujat i vinculat a este cas.",
      "tools.title": "Eines recomanades",
      "tools.copy": "Les recomanacions es basen en regles i poden contindre enllaços d'afiliat.",
      "tools.empty": "Encara no hi ha eines que coincidisquen amb este cas.",
      "tools.relevant": "Eina de diagnòstic rellevant",
      "consent.title": "Consentiment de galetes i anuncis",
      "consent.body": "Usem emmagatzematge essencial per a l'inici de sessió i els casos guardats. Amb el teu consentiment també usem anuncis per a mantindre gratuïta l'ajuda per text.",
      "consent.legal": "Avís legal i privacitat",
      "consent.essential": "Només essencials",
      "consent.accept": "Accepta els anuncis",
      "caseForm.kicker": "Sessió de diagnòstic estructurada",
      "caseForm.title": "Cas nou de diagnòstic",
      "caseForm.caseTitle": "Títol del cas",
      "caseForm.caseTitlePlaceholder": "Fallada d'arrancada intermitent en calent",
      "caseForm.symptoms": "Símptomes",
      "caseForm.dtcCodes": "Codis d'avaria DTC",
      "caseForm.dtcHint": "Separa'ls amb comes o espais",
      "caseForm.previousWork": "Reparacions o proves anteriors",
      "caseForm.create": "Crea el cas guardat",
      "caseForm.saving": "S'està guardant el cas de diagnòstic...",
      "vehicle.year": "Any",
      "vehicle.make": "Marca",
      "vehicle.model": "Model",
      "vehicle.engine": "Motor / sistema de propulsió",
      "vehicle.fuelType": "Tipus de combustible",
      "vehicle.fuel": "Combustible",
      "vehicle.gearbox": "Canvi",
      "vehicle.ecu": "Identificador ECU",
      "vehicle.dtcCodes": "Codis DTC",
      "vehicle.priority": "Prioritat",
      "vehicle.mileage": "Quilometratge",
      "vehicle.area": "Àrea",
      "vehicle.brief": "Resum",
      "fuel.petrol": "Gasolina",
      "fuel.diesel": "Dièsel",
      "fuel.hybrid": "Híbrid",
      "fuel.electric": "Elèctric",
      "gearbox.manual": "Manual",
      "gearbox.automatic": "Automàtic",
      "gearbox.singleSpeed": "EV d'una velocitat",
      "auth.kicker": "Compte segur",
      "auth.email": "Correu o usuari administrador",
      "auth.password": "Contrasenya",
      "auth.existing": "Usa un inici de sessió existent",
      "auth.loggingIn": "S'està iniciant la sessió...",
      "auth.creating": "S'està creant el compte...",
      "auth.verify": "Revisa el correu per a verificar el compte i després inicia sessió.",
      "auth.forgot": "Has oblidat la contrasenya?",
      "auth.resetSending": "S'està enviant un enllaç segur...",
      "duration.minutes": "{minutes} minuts",
      "duration.hour": "1 hora",
      "duration.hours": "{hours} hores",
      "duration.30": "30 minuts",
      "duration.60": "1 hora",
      "duration.90": "90 minuts",
      "duration.120": "2 hores",
      "status.active": "Actiu",
      "status.waiting_for_mechanic": "Revisió humana",
      "status.assigned": "Assignat",
      "status.resolved": "Resolts",
      "status.archived": "Arxivat",
      "ad.label": "Publicitat",
    },
  };

  const BOOT_CONFIG = window.WRENCHLINE_CONFIG || {};
  const DEFAULT_SETTINGS = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    routeraEndpoint: "/api/routera",
    routeraModel: "openai/gpt-5.5",
    adsClient: "ca-pub-6817388263556075",
    adsSlot: "",
    adSlots: {},
    checkoutUrl: "/api/checkout",
    jitsiDomain: "meet.jit.si",
    adminUsername: "MechanicAdmin",
    adminEmail: "admin@diagnostica-online.com",
    ...BOOT_CONFIG,
  };

  const DEFAULT_SITE_CONTENT = {
    assistantName: "DiagnosticaOnline Diagnostics",
    assistantAvatarText: "DO",
    welcomeMessage:
      "Tell me the year, make, model, mileage, symptoms, warning lights, sounds, smells, and when the issue happens. We will work through the diagnosis step by step.",
    typingMessage: "Reviewing the symptoms and test history...",
    systemPrompt: [
      "You are DiagnosticaOnline's diagnostic engine.",
      "You are the primary AI diagnostician, not an intake assistant.",
      "Own the case from the first question through test planning and interpretation.",
      "Ask one concise diagnostic question at a time unless the driver has already provided enough information.",
      "Prioritize year, make, model, engine, mileage, warning lights, OBD-II codes, noises, leaks, smells, recent work, and when the symptom appears.",
      "Flag urgent safety conditions like overheating, brake loss, smoke, fuel smell, or oil pressure warnings.",
      "Do not offer human contact during a normal case. Request human review only when you cannot continue safely or reliably after reasonable remote diagnostics.",
      "Never show the customer a mechanic-facing case summary, internal brief, bullet-point diagnostic summary, or the heading Case Summary.",
      "Do not claim to replace an in-person mechanic.",
    ].join(" "),
    autonomousMode: true,
    escalationPolicy:
      "Escalate only after the AI has used the available vehicle details and reasonable remote tests and still needs human judgment. Do not escalate merely because more information or another test is needed.",
    escalationCustomerMessage:
      "This case needs a human review before I can guide you further safely. I have sent only the relevant case details to the review queue.",
    handoffAfterMessages: 3,
    handoffMessage:
      "I have enough detail for {technicianName} to continue. You can start a free technician text chat, or reserve a paid voice or video call whenever you're ready.",
    technicianName: "Elena M.",
    technicianTitle: "Diagnostic Technician",
    technicianStats: "4,218 satisfied drivers",
    technicianExperience: "22 years diagnosing drivability, brake, and electrical issues",
    technicianAvatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80",
    emailFromName: "DiagnosticaOnline",
    emailFromAddress: "verify@diagnostica-online.com",
    emailSubject: "Verify your DiagnosticaOnline account",
    emailIntro: "Confirm your email so your mechanic conversations stay saved to your account.",
    supportEmail: "support@diagnostica-online.com",
    businessAddress: "Add your business address in admin.",
    serviceArea: "Remote mechanic consulting",
    responseTimeCopy: "A technician will reply as soon as one is available.",
    emergencyDisclaimer:
      "If the vehicle may be unsafe, leaking fuel, smoking, losing brakes, or overheating severely, stop driving and contact local emergency or roadside assistance.",
    staffNotificationEmail: "support@diagnostica-online.com",
    textChatStartedMessage:
      "Free technician text chat is open. Keep typing in this same conversation and a technician can answer from the dashboard.",
    textChatWaitingMessage: "A technician has your case. Keep this page open or check saved cases for replies.",
    bookingConfirmationSubject: "Your DiagnosticaOnline mechanic booking",
    textChatConfirmationSubject: "Your DiagnosticaOnline technician text chat",
    videoRateUsd: 40,
    voiceRateUsd: 20,
    minimumCallMinutes: 30,
    maximumCallMinutes: 240,
    durationOptions: "30,60,90,120",
    refundPolicySummary: "Paid calls can be refunded or rescheduled if no technician joins the scheduled session.",
    consentEnabled: true,
    consentTitle: "Cookie and ad consent",
    consentBody:
      "We use essential storage for login and saved cases. With your consent, we also use ads to keep free text help available.",
    consentAcceptText: "Accept ads",
    consentRejectText: "Essential only",
    termsText:
      "DiagnosticaOnline provides AI-assisted automotive diagnostics, saved cases, file storage, free text chat when available, and optional paid voice or video consulting. Guidance is informational, may be incomplete, and does not replace an in-person inspection, factory service information, recall check, repair estimate, or safety inspection. You must have lawful authority to diagnose or modify the vehicle and remain responsible for safe tools, lifting, isolation, protective equipment, and deciding whether the vehicle can be operated.",
    privacyText:
      "We collect account details; vehicle information such as VIN or ECU identifiers when supplied; symptoms, DTCs, messages, uploads, AI usage and token estimates; booking/payment identifiers; and technical security logs. We use this data to provide and secure the service, enforce plan limits, send account or booking emails, and improve diagnostics. Data may be processed by Supabase, the configured AI provider, Resend, Stripe, Jitsi, and, after consent on free plans, Google AdSense. Contact the listed support address for access or deletion requests, subject to legal and fraud-prevention retention duties.",
    cookieText:
      "We use essential browser storage for login state, saved drafts, consent choices, and site preferences. Advertising is disabled for premium and admin plans. On free plans, Google AdSense may use cookies or similar technologies only after ad consent is accepted. Choosing Essential only keeps ad storage and personalized ad loading disabled.",
    refundText:
      "Free text chat is not charged. Paid voice or video calls are charged based on the selected duration and rate shown at checkout. Add your final refund, cancellation, no-show, and rescheduling rules in admin before accepting production payments.",
    disclaimerText:
      "AI intake and remote consulting are not emergency services and cannot guarantee a diagnosis or repair. Vehicle work can involve fire, fuel, toxic chemicals, high voltage, moving components, stored pressure, air bags, and crushing hazards. Stop driving and seek qualified local help for smoke, fire risk, fuel leaks, brake or steering loss, severe overheating, oil-pressure warnings, or other immediate danger. ECU, immobilizer, and emissions laws vary by location. DiagnosticaOnline refuses emissions defeat, immobilizer bypass without lawful ownership procedures, odometer fraud, theft enablement, and unsafe bypass instructions, while allowing lawful diagnostics, repair, and restoration of original or factory software.",
    routeraEndpoint: DEFAULT_SETTINGS.routeraEndpoint,
    routeraModel: DEFAULT_SETTINGS.routeraModel,
    adsClient: DEFAULT_SETTINGS.adsClient,
    adsSlot: DEFAULT_SETTINGS.adsSlot,
    adSlots: {
      topBanner: "",
      leftTop: "",
      leftUpper: "",
      leftMiddle: "",
      leftLower: "",
      leftBottom: "",
      rightTop: "",
      rightUpper: "",
      rightMiddle: "",
      rightLower: "",
      rightBottom: "",
      inlineOne: "",
      inlineTwo: "",
      mobileChat: "",
      bottomBanner: "",
    },
    checkoutUrl: DEFAULT_SETTINGS.checkoutUrl,
    jitsiDomain: DEFAULT_SETTINGS.jitsiDomain,
  };

  const MAKE_WORDS = [
    "acura",
    "audi",
    "bmw",
    "buick",
    "cadillac",
    "chevrolet",
    "chevy",
    "chrysler",
    "dodge",
    "ford",
    "gmc",
    "honda",
    "hyundai",
    "infiniti",
    "jeep",
    "kia",
    "lexus",
    "mazda",
    "mercedes",
    "nissan",
    "ram",
    "subaru",
    "tesla",
    "toyota",
    "volkswagen",
    "volvo",
  ];

  const els = {};
  const state = {
    language: loadLanguage(),
    languageWasStored: hasStoredLanguage(),
    settings: loadSettings(),
    siteContent: { ...DEFAULT_SITE_CONTENT },
    conversations: [],
    activeId: "",
    vehicle: {},
    callType: "text",
    supabase: null,
    supabaseUser: null,
    profile: null,
    authSubscription: null,
    authMode: "login",
    saving: false,
    typing: false,
    checkoutNoticeShown: false,
    entitlements: {
      plan: "free",
      status: "active",
      isAdmin: false,
      isDisabled: false,
      showAds: true,
      aiMessagesUsedToday: 0,
      aiMessagesDailyLimit: 10,
      activeCases: 0,
      activeCaseLimit: 3,
      canSendAiMessage: true,
      canCreateCase: true,
    },
    uploads: [],
    recommendations: [],
    bookings: [],
    platformError: "",
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    cacheElements();
    bindEvents();
    applyTranslations();
    loadLocalConversations();
    if (!state.conversations.length) {
      createConversation(false);
    } else {
      state.activeId = state.conversations[0].id;
      state.vehicle = { ...(currentConversation()?.vehicle || {}) };
    }
    fillSettingsForm();
    renderAll();
    if (!state.languageWasStored) openLanguageScreen(true);
    await connectSupabase();
    await loadSiteContent();
    await loadSupabaseConversations();
    await loadDiagnosticCases();
    await loadBookings();
    renderAll();
    renderCheckoutReturnNotice();
    renderAds();
    startTextChatPolling();
    createIcons();
  }

  function cacheElements() {
    [
      "accountBadge",
      "languageBtn",
      "languageCurrentLabel",
      "languageDialog",
      "closeLanguageBtn",
      "loginNavBtn",
      "signupNavBtn",
      "logoutBtn",
      "settingsBtn",
      "adminNavBtn",
      "newConversationBtn",
      "savedCasesToggle",
      "diagnosticsTab",
      "repairLibraryToggle",
      "savedDrawer",
      "refreshConversationsBtn",
      "conversationList",
      "messages",
      "messageInput",
      "chatForm",
      "briefBtn",
      "escalationPanel",
      "clearCaseBtn",
      "vehicleDetails",
      "caseStatusPill",
      "planStrip",
      "planBadge",
      "planUsageCopy",
      "usageMeterFill",
      "premiumBtn",
      "caseUploadsPanel",
      "caseUploadInput",
      "caseUploadBtn",
      "caseUploadMessage",
      "caseUploadList",
      "recommendationsPanel",
      "recommendationList",
      "durationSelect",
      "bookingPrice",
      "bookingControls",
      "scheduleControls",
      "scheduledStartInput",
      "bookingBtn",
      "bookingResult",
      "siteNotice",
      "liveSessionsPanel",
      "liveSessionsList",
      "refreshBookingsBtn",
      "technicianAvatar",
      "technicianNameTitle",
      "technicianStats",
      "technicianExperience",
      "onlineCopy",
      "contactNavLink",
      "consentBanner",
      "consentTitle",
      "consentBody",
      "consentAcceptBtn",
      "consentRejectBtn",
      "caseDialog",
      "caseForm",
      "closeCaseDialogBtn",
      "cancelCaseBtn",
      "createCaseBtn",
      "caseTitleInput",
      "caseYearInput",
      "caseMakeInput",
      "caseModelInput",
      "caseEngineInput",
      "caseFuelInput",
      "caseGearboxInput",
      "caseVinInput",
      "caseEcuInput",
      "caseSymptomsInput",
      "caseDtcInput",
      "casePreviousWorkInput",
      "caseFormMessage",
      "authDialog",
      "authForm",
      "authTitle",
      "authEmailInput",
      "authPasswordInput",
      "authMessage",
      "authSubmitBtn",
      "switchAuthModeBtn",
      "forgotPasswordBtn",
      "closeAuthBtn",
      "settingsDialog",
      "settingsForm",
      "resetSettingsBtn",
      "integrationStatus",
      "supabaseUrlInput",
      "supabaseAnonInput",
      "routeraEndpointInput",
      "routeraModelInput",
      "adsClientInput",
      "adsSlotInput",
      "checkoutUrlInput",
      "jitsiDomainInput",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
    els.callOptions = Array.from(document.querySelectorAll("[data-call-type]"));
    els.quickPrompts = Array.from(document.querySelectorAll("[data-prompt]"));
    els.adMounts = Array.from(document.querySelectorAll(".ad-mount"));
    els.languageOptions = Array.from(document.querySelectorAll("[data-language]"));
  }

  function bindEvents() {
    els.languageBtn.addEventListener("click", () => openLanguageScreen(false));
    els.closeLanguageBtn.addEventListener("click", () => els.languageDialog.close());
    els.languageOptions.forEach((button) => {
      button.addEventListener("click", async () => {
        await setLanguage(button.dataset.language, true);
        els.languageDialog.close();
      });
    });
    els.savedCasesToggle.addEventListener("click", () => {
      els.savedDrawer.hidden = !els.savedDrawer.hidden;
      renderConversations();
    });
    els.newConversationBtn.addEventListener("click", openCaseDialog);
    els.refreshConversationsBtn.addEventListener("click", async () => {
      await loadSupabaseConversations();
      await loadDiagnosticCases();
      renderAll();
    });
    els.repairLibraryToggle.addEventListener("click", () => {
      if (!isDiagnosticCase()) {
        openCaseDialog();
        return;
      }
      els.recommendationsPanel.hidden = false;
      els.recommendationsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    els.diagnosticsTab.addEventListener("click", () => {
      els.messageInput.focus();
    });
    els.loginNavBtn.addEventListener("click", () => openAuth("login"));
    els.signupNavBtn.addEventListener("click", () => openAuth("signup"));
    els.adminNavBtn.addEventListener("click", async () => {
      if (!state.supabaseUser || state.profile?.id !== state.supabaseUser.id || state.profile?.role !== "admin") return;
      window.location.href = "/admin";
    });
    els.closeAuthBtn.addEventListener("click", () => els.authDialog.close());
    els.switchAuthModeBtn.addEventListener("click", () => setAuthMode(state.authMode === "login" ? "signup" : "login"));
    els.forgotPasswordBtn.addEventListener("click", requestPasswordReset);
    els.authForm.addEventListener("submit", handleAuthSubmit);
    els.logoutBtn.addEventListener("click", signOut);

    els.settingsBtn.addEventListener("click", () => {
      fillSettingsForm();
      els.settingsDialog.showModal();
      createIcons();
    });
    els.settingsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (event.submitter?.value === "cancel") {
        els.settingsDialog.close();
        return;
      }
      saveSettingsFromForm();
      els.settingsDialog.close();
      await connectSupabase(true);
      await loadSiteContent();
      await loadSupabaseConversations();
      await loadDiagnosticCases();
      renderAds();
      renderAll();
    });
    els.resetSettingsBtn.addEventListener("click", async () => {
      state.settings = { ...DEFAULT_SETTINGS };
      localStorage.removeItem(STORAGE.settings);
      fillSettingsForm();
      await connectSupabase(true);
      renderAds();
      renderAll();
    });

    els.chatForm.addEventListener("submit", handleSend);
    els.quickPrompts.forEach((button) => {
      button.addEventListener("click", () => {
        els.messageInput.value = button.dataset.prompt;
        els.messageInput.focus();
      });
    });
    els.briefBtn.addEventListener("click", createBrief);
    els.clearCaseBtn.addEventListener("click", clearCurrentCase);
    els.callOptions.forEach((button) => {
      button.addEventListener("click", () => {
        state.callType = button.dataset.callType;
        renderBooking();
      });
    });
    els.durationSelect.addEventListener("change", renderBooking);
    els.bookingBtn.addEventListener("click", reserveMechanic);
    els.premiumBtn.addEventListener("click", openPremiumBilling);
    els.refreshBookingsBtn.addEventListener("click", async () => {
      await loadBookings();
      renderAll();
    });
    els.liveSessionsList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-join-booking]");
      if (button) joinBooking(button.dataset.joinBooking);
    });
    els.consentAcceptBtn.addEventListener("click", () => saveConsent("ads"));
    els.consentRejectBtn.addEventListener("click", () => saveConsent("essential"));
    els.caseForm.addEventListener("submit", handleCreateDiagnosticCase);
    els.closeCaseDialogBtn.addEventListener("click", () => els.caseDialog.close());
    els.cancelCaseBtn.addEventListener("click", () => els.caseDialog.close());
    els.caseUploadInput.addEventListener("change", () => {
      els.caseUploadBtn.disabled = !els.caseUploadInput.files?.length;
      els.caseUploadMessage.textContent = els.caseUploadInput.files?.[0]?.name || "";
    });
    els.caseUploadBtn.addEventListener("click", uploadDiagnosticFile);
  }

  function hasStoredLanguage() {
    try {
      return Boolean(localStorage.getItem(STORAGE.language));
    } catch (error) {
      return false;
    }
  }

  function loadLanguage() {
    try {
      const stored = localStorage.getItem(STORAGE.language);
      if (stored && SUPPORTED_LANGUAGES[stored]) return stored;
    } catch (error) {
      // Browser language remains a safe fallback when storage is unavailable.
    }
    const browserLanguage = String(navigator.language || "en").toLowerCase();
    if (browserLanguage.startsWith("ro")) return "ro";
    if (browserLanguage.startsWith("ca")) return "ca-valencia";
    if (browserLanguage.startsWith("es")) return "es";
    return "en";
  }

  function t(key, variables = {}) {
    const template = TRANSLATIONS[state.language]?.[key] ?? TRANSLATIONS.en[key] ?? key;
    return String(template).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => String(variables[name] ?? ""));
  }

  function applyTranslations() {
    const language = SUPPORTED_LANGUAGES[state.language] || SUPPORTED_LANGUAGES.en;
    document.documentElement.lang = language.htmlLang;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-prompt]").forEach((element) => {
      element.dataset.prompt = t(element.dataset.i18nPrompt);
    });
    if (els.languageCurrentLabel) els.languageCurrentLabel.textContent = language.label;
    (els.languageOptions || []).forEach((button) => {
      const active = button.dataset.language === state.language;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function openLanguageScreen(firstVisit) {
    if (!els.languageDialog) return;
    els.closeLanguageBtn.hidden = Boolean(firstVisit && !state.languageWasStored);
    applyTranslations();
    if (!els.languageDialog.open) els.languageDialog.showModal();
    createIcons();
  }

  async function setLanguage(languageCode, persistForAccount) {
    if (!SUPPORTED_LANGUAGES[languageCode]) return;
    state.language = languageCode;
    state.languageWasStored = true;
    try {
      localStorage.setItem(STORAGE.language, languageCode);
    } catch (error) {
      // The active page can still use the selected language without persistence.
    }
    localizeGeneratedMessages();
    applyTranslations();
    renderAll();
    if (persistForAccount && state.supabaseUser) await persistLanguagePreference(languageCode);
  }

  function localizeGeneratedMessages() {
    const generatedCopies = Object.values(TRANSLATIONS).flatMap((translations) => [translations["chat.welcome"], translations["case.setupMessage"]]);
    state.conversations.forEach((conversation) => {
      conversation.messages.forEach((message) => {
        if (!generatedCopies.includes(message.content)) return;
        message.content = message.systemMessage ? t("case.setupMessage") : t("chat.welcome");
      });
    });
    persistLocal();
  }

  async function persistLanguagePreference(languageCode) {
    if (!state.supabaseUser || !SUPPORTED_LANGUAGES[languageCode]) return;
    try {
      await platformRequest("/api/account/preferences", {
        method: "PUT",
        body: JSON.stringify({ language: languageCode }),
      });
      if (state.profile) state.profile.preferred_language = languageCode;
    } catch (error) {
      // Local persistence keeps language selection working until the schema is updated.
    }
  }

  function localizedSiteCopy(field, translationKey) {
    const current = state.siteContent?.[field];
    return !current || current === DEFAULT_SITE_CONTENT[field] ? t(translationKey) : current;
  }

  function createConversation(makeActive) {
    const id = newId();
    const createdAt = new Date().toISOString();
    const conversation = {
      id,
      title: "New mechanic case",
      vehicle: {},
      messages: [
        {
          role: "assistant",
          name: assistantName(),
          content: localizedSiteCopy("welcomeMessage", "chat.welcome"),
          createdAt,
        },
      ],
      brief: "",
      status: "ai_intake",
      priority: "normal",
      createdAt,
      updatedAt: createdAt,
      source: "local",
    };
    state.conversations.unshift(conversation);
    if (makeActive || !state.activeId) {
      state.activeId = id;
      state.vehicle = {};
    }
    persistLocal();
    renderAll();
  }

  function openCaseDialog(message = "") {
    if (typeof message !== "string") message = "";
    if (!state.supabaseUser) {
      openAuth("login", "Log in or create an account before starting a saved diagnostic case.");
      return;
    }
    if (!state.entitlements.canCreateCase) {
      const limit = state.entitlements.activeCaseLimit ?? "unlimited";
      els.bookingResult.hidden = false;
      els.bookingResult.textContent = `Your ${state.entitlements.plan} plan allows ${limit} active cases. Resolve or archive one before creating another.`;
      return;
    }
    const prefilledSymptoms = message ? els.caseSymptomsInput.value : "";
    els.caseForm.reset();
    els.caseSymptomsInput.value = prefilledSymptoms;
    els.caseFormMessage.textContent = message;
    els.caseDialog.showModal();
    els.caseYearInput.focus();
    createIcons();
  }

  async function handleCreateDiagnosticCase(event) {
    event.preventDefault();
    if (!els.caseForm.reportValidity()) return;
    const payload = {
      title: els.caseTitleInput.value.trim() || undefined,
      vehicle: {
        year: Number(els.caseYearInput.value),
        make: els.caseMakeInput.value.trim(),
        model: els.caseModelInput.value.trim(),
        engine: els.caseEngineInput.value.trim(),
        fuelType: els.caseFuelInput.value,
        gearbox: els.caseGearboxInput.value,
        vin: els.caseVinInput.value.trim().toUpperCase(),
        ecu: els.caseEcuInput.value.trim(),
      },
      symptoms: els.caseSymptomsInput.value.trim(),
      dtcCodes: normalizeDtcInput(els.caseDtcInput.value),
      previousWork: els.casePreviousWorkInput.value.trim(),
      language: state.language,
    };

    els.createCaseBtn.disabled = true;
    els.caseFormMessage.textContent = t("caseForm.saving");
    try {
      const data = await platformRequest("/api/diagnostics/cases", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const conversation = fromDiagnosticCaseRow(data.case, data.messages || []);
      state.conversations = [conversation, ...state.conversations.filter((item) => item.id !== conversation.id)];
      state.activeId = conversation.id;
      state.vehicle = { ...conversation.vehicle };
      state.entitlements = data.entitlements || state.entitlements;
      state.uploads = [];
      state.recommendations = [];
      state.platformError = "";
      els.savedDrawer.hidden = false;
      els.caseDialog.close();
      renderAll();
      renderAds();
      els.messageInput.focus();
    } catch (error) {
      els.caseFormMessage.textContent = error.message || "The diagnostic case could not be saved.";
    } finally {
      els.createCaseBtn.disabled = false;
    }
  }

  async function loadDiagnosticCases() {
    if (!state.supabase || !state.supabaseUser) return;
    try {
      const data = await platformRequest("/api/diagnostics/cases");
      const diagnosticRows = (data.cases || []).map((row) => fromDiagnosticCaseRow(row, []));
      const diagnosticIds = new Set(diagnosticRows.map((conversation) => conversation.id));
      const compatibilityRows = state.conversations.filter(
        (conversation) => conversation.source !== "diagnostic" && conversation.source !== "local" && !diagnosticIds.has(conversation.id)
      );
      const currentId = state.activeId;
      state.conversations = [...diagnosticRows, ...compatibilityRows];
      state.entitlements = data.entitlements || state.entitlements;
      state.platformError = "";
      if (!state.conversations.some((conversation) => conversation.id === currentId)) {
        state.activeId = state.conversations[0]?.id || "";
      }
      const active = currentConversation();
      state.vehicle = { ...(active?.vehicle || {}) };
      if (active?.source === "diagnostic") await loadDiagnosticCase(active.id, false);
    } catch (error) {
      state.platformError = error.message || "Structured diagnostic cases are unavailable until the latest Supabase schema is installed.";
    }
  }

  async function loadDiagnosticCase(caseId, renderAfter = true) {
    if (!state.supabaseUser || !isUuid(caseId)) return false;
    try {
      const data = await platformRequest(`/api/diagnostics/cases/${encodeURIComponent(caseId)}`);
      const conversation = fromDiagnosticCaseRow(data.case, data.messages || []);
      const index = state.conversations.findIndex((item) => item.id === caseId);
      if (index >= 0) state.conversations[index] = conversation;
      else state.conversations.unshift(conversation);
      state.activeId = caseId;
      state.vehicle = { ...conversation.vehicle };
      state.uploads = data.uploads || [];
      state.recommendations = data.recommendations || [];
      state.entitlements = data.entitlements || state.entitlements;
      state.platformError = "";
      if (renderAfter) {
        renderAll();
        renderAds();
      }
      return true;
    } catch (error) {
      state.platformError = error.message || "This diagnostic case could not be opened.";
      if (renderAfter) renderAll();
      return false;
    }
  }

  function fromDiagnosticCaseRow(row, messageRows) {
    const vehicle = row.vehicle || {};
    return {
      id: row.id,
      title: row.title || "Diagnostic case",
      vehicle: {
        year: vehicle.year ? String(vehicle.year) : "",
        make: vehicle.make || "",
        model: vehicle.model || "",
        engine: vehicle.engine || "",
        fuelType: vehicle.fuel_type || "",
        gearbox: vehicle.gearbox || "",
        vin: vehicle.vin || "",
        ecu: vehicle.ecu || "",
        category: row.dtc_codes?.length ? "Fault-code diagnosis" : "Symptom diagnosis",
      },
      messages: (messageRows || []).map(fromDiagnosticMessage),
      brief: row.ai_summary || "",
      status: row.status || "active",
      priority: row.priority || "normal",
      caseData: row,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      source: "diagnostic",
    };
  }

  function fromDiagnosticMessage(message) {
    const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : {};
    const isUser = message.sender_type === "user";
    const isMechanic = message.sender_type === "mechanic";
    const isSystem = message.sender_type === "system";
    return {
      id: message.id,
      role: isUser ? "user" : "assistant",
      name: isUser ? t("common.you") : isMechanic ? state.siteContent.technicianName : isSystem ? t("common.caseSetup") : assistantName(),
      content: isSystem && metadata.source === "case_setup" ? t("case.setupMessage") : message.content || "",
      createdAt: message.created_at || new Date().toISOString(),
      technicianReply: isMechanic,
      systemMessage: isSystem,
      provider: message.provider || "",
      model: message.model || "",
      inputTokens: Number(message.input_tokens || 0),
      outputTokens: Number(message.output_tokens || 0),
      escalationRequired: metadata.escalation_required === true,
      escalationCategory: metadata.escalation_category || "none",
      escalationReason: metadata.escalation_reason || "",
      handoff: metadata.escalation_required === true,
      alert: metadata.escalation_category === "safety_review",
    };
  }

  async function sendDiagnosticMessage(text) {
    const conversation = currentConversation();
    if (!conversation || conversation.source !== "diagnostic") return;
    const wasInHumanReview = isHumanReviewRequired(conversation);
    if (!state.entitlements.canSendAiMessage) {
      showLocalCaseNotice(`Daily diagnostic message limit reached for the ${state.entitlements.plan} plan. Your allowance resets at 00:00 UTC.`, true);
      return;
    }

    const tempId = `temp-${newId()}`;
    conversation.messages.push({ role: "user", name: t("common.you"), content: text, createdAt: new Date().toISOString(), id: tempId });
    conversation.updatedAt = new Date().toISOString();
    state.typing = true;
    renderMessages();
    renderPlanStatus();
    try {
      const data = await platformRequest(`/api/diagnostics/cases/${encodeURIComponent(conversation.id)}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: text, language: state.language }),
      });
      conversation.messages = conversation.messages.filter((message) => message.id !== tempId);
      if (data.userMessage) conversation.messages.push(fromDiagnosticMessage(data.userMessage));
      if (data.assistantMessage) conversation.messages.push(fromDiagnosticMessage(data.assistantMessage));
      conversation.updatedAt = data.assistantMessage?.created_at || data.userMessage?.created_at || new Date().toISOString();
      conversation.brief = data.assistantMessage?.content || conversation.brief;
      conversation.status = data.caseStatus || conversation.status;
      conversation.priority = data.priority || conversation.priority;
      if (conversation.caseData) {
        conversation.caseData.status = conversation.status;
        conversation.caseData.priority = conversation.priority;
      }
      state.entitlements = data.entitlements || state.entitlements;
      state.recommendations = data.recommendations || state.recommendations;
      state.platformError = "";
      if (data.routing?.required && !wasInHumanReview) {
        await notifyStaff("ai_escalation", { diagnosticCaseId: conversation.id, title: conversation.title });
      }
      renderAll();
      renderAds();
    } catch (error) {
      conversation.messages = conversation.messages.filter((message) => message.id !== tempId);
      await loadDiagnosticCase(conversation.id, false);
      showLocalCaseNotice(error.message || "The diagnostic reply could not be generated.", true);
    } finally {
      state.typing = false;
      renderAll();
    }
  }

  function showLocalCaseNotice(content, alert = false) {
    const conversation = currentConversation();
    if (!conversation) return;
    conversation.messages.push({
      id: `local-${newId()}`,
      role: "assistant",
      name: "DiagnosticaOnline",
      content,
      createdAt: new Date().toISOString(),
      alert,
      localOnly: true,
    });
    renderMessages();
  }

  async function uploadDiagnosticFile() {
    const conversation = currentConversation();
    const file = els.caseUploadInput.files?.[0];
    if (!conversation || conversation.source !== "diagnostic" || !file || !state.supabase) return;
    els.caseUploadBtn.disabled = true;
    els.caseUploadMessage.textContent = `Preparing ${file.name}...`;
    try {
      const mimeType = file.type || "application/octet-stream";
      const signed = await platformRequest(`/api/diagnostics/cases/${encodeURIComponent(conversation.id)}/uploads`, {
        method: "POST",
        body: JSON.stringify({ action: "sign", fileName: file.name, mimeType, sizeBytes: file.size }),
      });
      els.caseUploadMessage.textContent = `Uploading ${file.name}...`;
      const { error: uploadError } = await state.supabase.storage
        .from(signed.bucket)
        .uploadToSignedUrl(signed.storagePath, signed.token, file, { contentType: mimeType });
      if (uploadError) throw uploadError;
      const completed = await platformRequest(`/api/diagnostics/cases/${encodeURIComponent(conversation.id)}/uploads`, {
        method: "POST",
        body: JSON.stringify({
          action: "complete",
          storagePath: signed.storagePath,
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
          uploadKind: signed.uploadKind,
        }),
      });
      state.uploads = [completed.upload, ...state.uploads.filter((upload) => upload.id !== completed.upload.id)];
      els.caseUploadInput.value = "";
      els.caseUploadMessage.textContent = completed.upload.analysis_error || completed.upload.analysis_summary || t("uploads.success");
      renderUploads();
      createIcons();
    } catch (error) {
      els.caseUploadMessage.textContent = error.message || "The diagnostic file could not be uploaded.";
    } finally {
      els.caseUploadBtn.disabled = !els.caseUploadInput.files?.length;
    }
  }

  async function platformRequest(url, options = {}) {
    if (!state.supabase) throw new Error("Supabase is not connected.");
    const { data } = await state.supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("Log in to continue.");
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The server request failed.");
    return payload;
  }

  async function loadBookings() {
    if (!state.supabase || !state.supabaseUser) {
      state.bookings = [];
      return;
    }
    try {
      const data = await platformRequest("/api/bookings");
      state.bookings = data.bookings || [];
    } catch (error) {
      state.bookings = [];
    }
  }

  async function openPremiumBilling() {
    if (!state.supabaseUser) {
      openAuth("login", "Log in before changing your plan.");
      return;
    }
    const premiumActive = state.entitlements.plan === "premium";
    els.premiumBtn.disabled = true;
    try {
      const data = await platformRequest(premiumActive ? "/api/billing/portal" : "/api/billing/checkout", { method: "POST" });
      if (!data.url) throw new Error("Stripe did not return a billing URL.");
      window.location.href = data.url;
    } catch (error) {
      showLocalCaseNotice(error.message || "Billing could not be opened.", true);
      els.premiumBtn.disabled = false;
    }
  }

  async function joinBooking(bookingId) {
    const popup = window.open("about:blank", "_blank", "noopener");
    try {
      const data = await platformRequest(`/api/bookings/${encodeURIComponent(bookingId)}/meeting`);
      if (!data.url) throw new Error("The meeting URL is not available.");
      if (popup) popup.location.href = data.url;
      else window.location.href = data.url;
    } catch (error) {
      if (popup) popup.close();
      showLocalCaseNotice(error.message || "The meeting could not be opened.", true);
      await loadBookings();
      renderAll();
    }
  }

  function normalizeDtcInput(value) {
    return Array.from(
      new Set(
        String(value || "")
          .toUpperCase()
          .split(/[\s,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  function isDiagnosticCase(conversation = currentConversation()) {
    return conversation?.source === "diagnostic";
  }

  async function handleSend(event) {
    event.preventDefault();
    const text = els.messageInput.value.trim();
    if (!text || state.typing) return;
    if (state.supabase && !state.supabaseUser) {
      openAuth("login", "Log in or create an account to use the diagnostic workspace and save your cases.");
      return;
    }
    if (state.supabaseUser && !isDiagnosticCase()) {
      els.caseSymptomsInput.value = text;
      openCaseDialog("Create a structured case before sending the first diagnostic message.");
      return;
    }
    els.messageInput.value = "";
    if (isDiagnosticCase()) {
      await sendDiagnosticMessage(text);
      return;
    }
    const technicianTextMode = isTechnicianTextMode();
    if (technicianTextMode) {
      await refreshCurrentConversation();
    }
    await addMessage("user", text, { name: "You", technicianText: technicianTextMode });
    inferVehicle(text);
    const conversation = currentConversation();
    if (conversation) conversation.vehicle = { ...state.vehicle };
    renderVehicleDetails();
    if (technicianTextMode) {
      await saveCurrentConversation();
      return;
    }
    await respondToUser(text);
  }

  async function addMessage(role, content, meta = {}) {
    const conversation = currentConversation();
    if (!conversation) return;
    conversation.messages.push({
      role,
      content,
      createdAt: new Date().toISOString(),
      ...meta,
    });
    if (role === "user" && conversation.title === "New mechanic case") {
      conversation.title = titleFromText(content);
    }
    if (role === "user" && isTechnicianTextMode(conversation)) {
      conversation.status = "waiting_for_mechanic";
    }
    if (meta.technicianReply) {
      conversation.status = "answered";
    }
    conversation.vehicle = { ...state.vehicle };
    conversation.updatedAt = new Date().toISOString();
    persistLocal();
    renderAll();
    await saveCurrentConversation();
  }

  async function respondToUser() {
    state.typing = true;
    renderMessages();
    try {
      const result = await getDiagnosticReply();
      if (!result.text) throw new Error("The diagnostic service returned an empty response.");
      const conversation = currentConversation();
      if (result.routing?.required && conversation) conversation.status = "waiting_for_mechanic";
      await addMessage("assistant", result.text, {
        name: assistantName(),
        ...classifyReply(result.text, result.routing),
      });
    } catch (error) {
      const message =
        "The diagnostic service is temporarily unavailable. Please try again shortly.";
      await addMessage("assistant", message, {
        name: assistantName(),
        alert: true,
      });
    } finally {
      state.typing = false;
      renderMessages();
    }
  }

  async function getDiagnosticReply() {
    const conversation = currentConversation();
    if (!conversation) return "";
    const endpoint = state.settings.routeraEndpoint || DEFAULT_SETTINGS.routeraEndpoint;
    if (!endpoint) throw new Error("The diagnostic endpoint is not configured.");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversation.messages,
        vehicle: state.vehicle,
        brief: conversation.brief,
        siteContent: state.siteContent,
        systemPrompt: mechanicSystemPrompt(),
        model: state.settings.routeraModel || DEFAULT_SETTINGS.routeraModel,
        language: state.language,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The diagnostic endpoint failed.");
    return {
      text: customerFacingReply((data.text || data.reply || "").trim()),
      routing: data.routing || { required: false, category: "none", reason: "" },
    };
  }

  function mechanicSystemPrompt() {
    return state.siteContent.systemPrompt || DEFAULT_SITE_CONTENT.systemPrompt;
  }

  function assistantName() {
    return state.siteContent.assistantName || DEFAULT_SITE_CONTENT.assistantName;
  }

  function assistantAvatarText() {
    return (state.siteContent.assistantAvatarText || DEFAULT_SITE_CONTENT.assistantAvatarText).slice(0, 3);
  }

  function classifyReply(text, routing = {}) {
    return {
      alert: Boolean(text && /Safety note:/i.test(text)),
      handoff: routing.required === true,
      escalationRequired: routing.required === true,
      escalationCategory: routing.category || "none",
      escalationReason: routing.reason || "",
    };
  }

  function inferVehicle(text) {
    const lower = text.toLowerCase();
    const year = text.match(/\b(19[8-9]\d|20[0-3]\d)\b/);
    const mileage = text.match(/\b(\d{2,3}[,.]?\d{3})\s*(miles|mi|km|kilometers)?\b/i);
    const make = MAKE_WORDS.find((word) => lower.includes(word));

    if (year) state.vehicle.year = year[1];
    if (make) state.vehicle.make = make === "chevy" ? "Chevrolet" : capitalize(make);
    if (mileage) state.vehicle.mileage = `${mileage[1].replace(",", "")} ${mileage[2] || "mi"}`;

    const modelGuess = modelAfterMake(text, make);
    if (modelGuess) state.vehicle.model = modelGuess;

    const issueTags = [];
    if (/\bcheck engine|cel|p0\d{3}|misfire\b/i.test(text)) issueTags.push("Engine");
    if (/\bbrake|rotor|pad|grind\b/i.test(text)) issueTags.push("Brakes");
    if (/\bstart|battery|alternator|starter\b/i.test(text)) issueTags.push("Starting");
    if (/\boverheat|coolant|radiator|temperature\b/i.test(text)) issueTags.push("Cooling");
    if (/\btransmission|shift|gear|clutch\b/i.test(text)) issueTags.push("Drivetrain");
    if (issueTags.length) {
      state.vehicle.category = Array.from(new Set([...(state.vehicle.category ? state.vehicle.category.split(", ") : []), ...issueTags])).join(", ");
    }
  }

  function modelAfterMake(text, make) {
    if (!make) return "";
    const pattern = new RegExp(`${make}\\s+([a-z0-9-]{2,}(?:\\s+[a-z0-9-]{2,})?)`, "i");
    const match = text.match(pattern);
    if (!match) return "";
    const stopWords = new Set(["with", "has", "had", "that", "and", "the", "is", "was", "miles", "mi", "km"]);
    return match[1]
      .split(/\s+/)
      .filter((word) => !stopWords.has(word.toLowerCase()))
      .slice(0, 2)
      .map(capitalize)
      .join(" ");
  }

  async function createBrief() {
    const conversation = currentConversation();
    if (!conversation) return;
    if (conversation.source === "diagnostic") {
      try {
        const data = await platformRequest(`/api/diagnostics/cases/${encodeURIComponent(conversation.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "waiting_for_mechanic" }),
        });
        conversation.caseData = data.case;
        conversation.status = data.case.status;
        els.bookingResult.hidden = false;
        els.bookingResult.textContent = "This structured case is now in the mechanic queue with its vehicle details, messages, tests, and uploads attached.";
        renderVehicleDetails();
      } catch (error) {
        els.bookingResult.hidden = false;
        els.bookingResult.textContent = error.message || "The case could not be sent to the mechanic queue.";
      }
      return;
    }
    conversation.brief = buildMechanicBrief();
    conversation.updatedAt = new Date().toISOString();
    persistLocal();
    saveCurrentConversation();
    addMessage("assistant", customerHandoffMessage(), {
      name: assistantName(),
      handoff: true,
    });
  }

  function customerFacingReply(text) {
    const stripped = stripPrivateCaseSections(text || "");
    if (!stripped || looksLikePrivateCaseSummary(text)) {
      return "I have kept the internal case notes private. Tell me the latest symptom or test result and I will continue the diagnosis.";
    }
    return stripped;
  }

  function stripPrivateCaseSections(text) {
    return String(text || "")
      .replace(/\n?\s*(?:\*\*)?(?:case summary|mechanic brief|technician brief|internal brief|private notes)(?:\*\*)?\s*:?\s*[\s\S]*$/i, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function looksLikePrivateCaseSummary(text) {
    return (
      /(?:\*\*)?case summary(?:\*\*)?\s*:/i.test(text || "") ||
      /(?:mechanic|technician|internal)\s+brief\s*:/i.test(text || "") ||
      /technician-ready case/i.test(text || "") ||
      /brief already in hand/i.test(text || "") ||
      /organized the symptoms/i.test(text || "")
    );
  }

  function customerHandoffMessage() {
    const template = state.siteContent.escalationCustomerMessage || DEFAULT_SITE_CONTENT.escalationCustomerMessage;
    const fallback = DEFAULT_SITE_CONTENT.escalationCustomerMessage;
    const candidate = stripPrivateCaseSections(template);
    return !candidate || looksLikePrivateCaseSummary(candidate) ? fallback : candidate;
  }

  function buildMechanicBrief() {
    const conversation = currentConversation();
    const userNotes = (conversation?.messages || [])
      .filter((message) => message.role === "user")
      .slice(-6)
      .map((message) => `- ${message.content}`)
      .join("\n");
    const vehicle = [state.vehicle.year, state.vehicle.make, state.vehicle.model, state.vehicle.mileage ? `(${state.vehicle.mileage})` : ""]
      .filter(Boolean)
      .join(" ");

    return [
      `Vehicle: ${vehicle || "Not captured yet"}`,
      `Area: ${state.vehicle.category || "Needs diagnosis"}`,
      "Driver notes:",
      userNotes || "- No driver notes yet",
      "Priority checks: warning lights/codes, fluid leaks, recent maintenance, exact sound/smell, and whether the car is safe to drive.",
    ].join("\n");
  }

  async function clearCurrentCase() {
    const conversation = currentConversation();
    if (!conversation) return;
    if (conversation.source === "diagnostic") {
      if (!window.confirm("Archive this diagnostic case? Its messages and uploads will remain saved.")) return;
      try {
        await platformRequest(`/api/diagnostics/cases/${encodeURIComponent(conversation.id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "archived" }),
        });
        await loadDiagnosticCases();
        renderAll();
        renderAds();
      } catch (error) {
        showLocalCaseNotice(error.message || "The case could not be archived.", true);
      }
      return;
    }
    conversation.messages = conversation.messages.slice(0, 1);
    conversation.vehicle = {};
    conversation.brief = "";
    conversation.title = "New mechanic case";
    conversation.updatedAt = new Date().toISOString();
    state.vehicle = {};
    persistLocal();
    saveCurrentConversation();
    renderAll();
  }

  async function reserveMechanic() {
    if (state.supabase && !state.supabaseUser) {
      openAuth("login", state.callType === "text" ? "Log in before starting a free technician text chat." : "Log in before reserving a live mechanic call.");
      return;
    }

    const isTextChat = state.callType === "text";
    const duration = isTextChat ? 0 : Number(els.durationSelect.value);
    const rate = rateForCallType(state.callType);
    const total = Math.round((rate * duration) / 60);
    const conversation = currentConversation();
    const payload = {
      callType: state.callType,
      durationMinutes: duration,
      hourlyRate: rate,
      totalUsd: total,
      scheduledStartAt: els.scheduledStartInput?.value ? new Date(els.scheduledStartInput.value).toISOString() : "",
      conversationId: conversation?.source === "diagnostic" ? null : conversation?.id,
      diagnosticCaseId: conversation?.source === "diagnostic" ? conversation.id : null,
      title: conversation?.title || "Mechanic consultation",
      brief: conversation?.brief || buildMechanicBrief(),
    };

    els.bookingBtn.disabled = true;
    els.bookingResult.hidden = false;
    els.bookingResult.textContent = isTextChat ? "Opening free technician text chat..." : "Preparing checkout...";

    try {
      if (isTextChat) {
        await startTechnicianTextChat(payload);
        return;
      }
      if (state.settings.checkoutUrl) {
        const headers = { "Content-Type": "application/json" };
        const { data: sessionData } = state.supabase ? await state.supabase.auth.getSession() : { data: null };
        if (sessionData?.session?.access_token) headers.Authorization = `Bearer ${sessionData.session.access_token}`;
        const response = await fetch(state.settings.checkoutUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        const checkoutData = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(checkoutData.error || "Checkout function failed");
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
      }
      throw new Error("Paid checkout is not configured.");
    } catch (error) {
      els.bookingResult.innerHTML = `
        <strong>Booking could not be started.</strong><br>
        ${escapeHtml(error.message || "The payment service is temporarily unavailable.")}
      `;
    } finally {
      els.bookingBtn.disabled = false;
    }
  }

  async function startTechnicianTextChat(payload) {
    const conversation = currentConversation();
    if (conversation?.source === "diagnostic") {
      await platformRequest(`/api/diagnostics/cases/${encodeURIComponent(conversation.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "waiting_for_mechanic" }),
      });
      conversation.status = "waiting_for_mechanic";
      if (conversation.caseData) conversation.caseData.status = "waiting_for_mechanic";
      showLocalCaseNotice(state.siteContent.textChatWaitingMessage || DEFAULT_SITE_CONTENT.textChatWaitingMessage);
      els.bookingResult.innerHTML = `
        <strong>Free technician text chat requested.</strong><br>
        Your structured case and files are now visible in the mechanic queue. Keep using this case for updates.
      `;
      await saveBooking(payload, "", "text_chat_open");
      await notifyStaff("text_chat_started", { conversationId: null, diagnosticCaseId: conversation.id, title: conversation.title });
      renderVehicleDetails();
      return;
    }
    if (conversation && !isTechnicianTextMode(conversation)) {
      conversation.status = "waiting_for_mechanic";
      await addMessage("assistant", state.siteContent.textChatStartedMessage || DEFAULT_SITE_CONTENT.textChatStartedMessage, {
        name: "Technician desk",
        handoff: true,
        technicianText: true,
      });
    }
    els.bookingResult.innerHTML = `
      <strong>Free technician text chat started.</strong><br>
      No checkout is needed. Keep typing in this case thread.
    `;
    await saveBooking(payload, "", "text_chat_open");
    await notifyStaff("text_chat_started", {
      conversationId: payload.conversationId,
      title: payload.title,
    });
  }

  async function saveBooking(payload, meetingUrl, status) {
    if (!state.supabase || !state.supabaseUser) return;
    try {
      await state.supabase.from("call_bookings").insert({
        owner_id: state.supabaseUser.id,
        conversation_id: isUuid(payload.conversationId) ? payload.conversationId : null,
        diagnostic_case_id: isUuid(payload.diagnosticCaseId) ? payload.diagnosticCaseId : null,
        call_type: payload.callType,
        duration_minutes: payload.durationMinutes,
        hourly_rate_usd: payload.hourlyRate,
        total_usd: payload.totalUsd,
        meeting_url: meetingUrl || null,
        scheduled_start_at: payload.scheduledStartAt ? new Date(payload.scheduledStartAt).toISOString() : null,
        customer_email: state.supabaseUser.email || null,
        status,
      });
    } catch (error) {
      showLocalCaseNotice("The text-review request opened, but its booking audit record could not be saved.", true);
    }
  }

  async function notifyStaff(type, payload = {}) {
    if (!state.supabase || !state.supabaseUser) return;
    try {
      const { data: sessionData } = await state.supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, ...payload }),
      });
    } catch (error) {
      // Notifications are useful, but the chat should still open if email is unavailable.
    }
  }

  async function connectSupabase(forceReset = false) {
    if (forceReset && state.authSubscription) {
      state.authSubscription.unsubscribe?.();
      state.authSubscription = null;
    }
    if (forceReset) {
      state.supabase = null;
      state.supabaseUser = null;
    }

    const { supabaseUrl, supabaseAnonKey } = state.settings;
    if (!supabaseUrl || !supabaseAnonKey || !window.supabase) {
      renderAuth();
      renderStatus();
      return;
    }

    try {
      state.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      await refreshSupabaseUser();
      const subscription = state.supabase.auth.onAuthStateChange(async (_event, session) => {
        state.supabaseUser = session?.user || null;
        state.profile = state.supabaseUser ? await loadProfile() : null;
        await syncLanguageFromProfile();
        renderAuth();
        if (state.supabaseUser) {
          await loadSupabaseConversations();
          await loadDiagnosticCases();
          await loadBookings();
          renderAll();
        }
      });
      state.authSubscription = subscription.data?.subscription || null;
    } catch (error) {
      state.supabase = null;
      state.supabaseUser = null;
    }
    renderAuth();
    renderStatus();
  }

  async function loadSiteContent() {
    state.siteContent = { ...DEFAULT_SITE_CONTENT, ...loadLocalSiteContent() };
    applyPublicSettingsFromSiteContent();
    if (!state.supabase) {
      renderTechnicianProfile();
      return;
    }

    try {
      const { data, error } = await state.supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
      if (error) throw error;
      if (data?.value && typeof data.value === "object") {
        state.siteContent = sanitizeSiteContent(data.value);
        localStorage.setItem(STORAGE.siteContent, JSON.stringify(state.siteContent));
      }
    } catch (error) {
      state.siteContent = { ...DEFAULT_SITE_CONTENT, ...loadLocalSiteContent() };
    }
    applyPublicSettingsFromSiteContent();
    renderTechnicianProfile();
  }

  function applyPublicSettingsFromSiteContent() {
    const content = state.siteContent || {};
    state.settings = {
      ...state.settings,
      routeraEndpoint: content.routeraEndpoint ?? state.settings.routeraEndpoint,
      routeraModel: content.routeraModel ?? state.settings.routeraModel,
      adsClient: content.adsClient ?? state.settings.adsClient,
      adsSlot: content.adsSlot ?? state.settings.adsSlot,
      adSlots: content.adSlots ?? state.settings.adSlots,
      checkoutUrl: content.checkoutUrl ?? state.settings.checkoutUrl,
      jitsiDomain: content.jitsiDomain ?? state.settings.jitsiDomain,
    };
  }

  function loadLocalSiteContent() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.siteContent) || "{}");
    } catch (error) {
      return {};
    }
  }

  function sanitizeSiteContent(value) {
    const merged = { ...DEFAULT_SITE_CONTENT, ...(value || {}) };
    const legacy = value || {};
    return {
      assistantName: /Gemini Diagnostic AI|DiagnosticaOnline AI/i.test(String(merged.assistantName || ""))
        ? DEFAULT_SITE_CONTENT.assistantName
        : cleanText(merged.assistantName, DEFAULT_SITE_CONTENT.assistantName),
      assistantAvatarText: String(merged.assistantAvatarText || "").trim().toUpperCase() === "AI"
        ? DEFAULT_SITE_CONTENT.assistantAvatarText
        : cleanText(merged.assistantAvatarText, DEFAULT_SITE_CONTENT.assistantAvatarText).slice(0, 3),
      welcomeMessage: /diagnostic intake assistant|I'm your AI mechanic/i.test(String(merged.welcomeMessage || ""))
        ? DEFAULT_SITE_CONTENT.welcomeMessage
        : cleanText(merged.welcomeMessage, DEFAULT_SITE_CONTENT.welcomeMessage),
      typingMessage: /Gemini is reviewing/i.test(String(merged.typingMessage || ""))
        ? DEFAULT_SITE_CONTENT.typingMessage
        : cleanText(merged.typingMessage, DEFAULT_SITE_CONTENT.typingMessage),
      systemPrompt: /intake LLM before a live technician handoff|live technician can continue/i.test(String(merged.systemPrompt || ""))
        ? DEFAULT_SITE_CONTENT.systemPrompt
        : cleanText(merged.systemPrompt, DEFAULT_SITE_CONTENT.systemPrompt),
      autonomousMode: merged.autonomousMode !== false && merged.autonomousMode !== "false",
      escalationPolicy: cleanText(merged.escalationPolicy, DEFAULT_SITE_CONTENT.escalationPolicy),
      escalationCustomerMessage: cleanText(merged.escalationCustomerMessage, DEFAULT_SITE_CONTENT.escalationCustomerMessage),
      handoffAfterMessages: Math.max(1, Math.min(12, Number(merged.handoffAfterMessages) || DEFAULT_SITE_CONTENT.handoffAfterMessages)),
      handoffMessage: cleanText(merged.handoffMessage, DEFAULT_SITE_CONTENT.handoffMessage),
      technicianName: cleanText(merged.technicianName, DEFAULT_SITE_CONTENT.technicianName),
      technicianTitle: cleanText(merged.technicianTitle, DEFAULT_SITE_CONTENT.technicianTitle),
      technicianStats: cleanText(merged.technicianStats, DEFAULT_SITE_CONTENT.technicianStats),
      technicianExperience: cleanText(merged.technicianExperience, DEFAULT_SITE_CONTENT.technicianExperience),
      technicianAvatar: cleanUrl(merged.technicianAvatar, DEFAULT_SITE_CONTENT.technicianAvatar),
      emailFromName: cleanText(merged.emailFromName, DEFAULT_SITE_CONTENT.emailFromName),
      emailFromAddress: cleanEmail(merged.emailFromAddress, DEFAULT_SITE_CONTENT.emailFromAddress),
      emailSubject: cleanText(merged.emailSubject, DEFAULT_SITE_CONTENT.emailSubject),
      emailIntro: cleanText(merged.emailIntro, DEFAULT_SITE_CONTENT.emailIntro),
      supportEmail: cleanEmail(merged.supportEmail, DEFAULT_SITE_CONTENT.supportEmail),
      staffNotificationEmail: cleanEmail(merged.staffNotificationEmail, DEFAULT_SITE_CONTENT.staffNotificationEmail),
      businessAddress: cleanText(merged.businessAddress, DEFAULT_SITE_CONTENT.businessAddress),
      serviceArea: cleanText(merged.serviceArea, DEFAULT_SITE_CONTENT.serviceArea),
      responseTimeCopy: cleanText(merged.responseTimeCopy, DEFAULT_SITE_CONTENT.responseTimeCopy),
      emergencyDisclaimer: cleanText(merged.emergencyDisclaimer, DEFAULT_SITE_CONTENT.emergencyDisclaimer),
      textChatStartedMessage: cleanText(merged.textChatStartedMessage, DEFAULT_SITE_CONTENT.textChatStartedMessage),
      textChatWaitingMessage: cleanText(merged.textChatWaitingMessage, DEFAULT_SITE_CONTENT.textChatWaitingMessage),
      bookingConfirmationSubject: cleanText(merged.bookingConfirmationSubject, DEFAULT_SITE_CONTENT.bookingConfirmationSubject),
      textChatConfirmationSubject: cleanText(merged.textChatConfirmationSubject, DEFAULT_SITE_CONTENT.textChatConfirmationSubject),
      routeraEndpoint: cleanEndpoint(legacy.routeraEndpoint || legacy.geminiEndpoint, DEFAULT_SETTINGS.routeraEndpoint),
      routeraModel: cleanText(legacy.routeraModel || legacy.geminiModel, DEFAULT_SETTINGS.routeraModel),
      adsClient: cleanAdsClient(merged.adsClient),
      adsSlot: cleanAdSlot(merged.adsSlot),
      adSlots: cleanAdSlots(merged.adSlots),
      checkoutUrl: cleanOptionalUrl(merged.checkoutUrl),
      jitsiDomain: cleanDomain(merged.jitsiDomain, DEFAULT_SETTINGS.jitsiDomain),
      videoRateUsd: cleanMoneyNumber(merged.videoRateUsd, DEFAULT_SITE_CONTENT.videoRateUsd),
      voiceRateUsd: cleanMoneyNumber(merged.voiceRateUsd, DEFAULT_SITE_CONTENT.voiceRateUsd),
      minimumCallMinutes: cleanMinuteNumber(merged.minimumCallMinutes, DEFAULT_SITE_CONTENT.minimumCallMinutes),
      maximumCallMinutes: cleanMinuteNumber(merged.maximumCallMinutes, DEFAULT_SITE_CONTENT.maximumCallMinutes),
      durationOptions: cleanDurationOptions(merged.durationOptions, DEFAULT_SITE_CONTENT.durationOptions),
      refundPolicySummary: cleanText(merged.refundPolicySummary, DEFAULT_SITE_CONTENT.refundPolicySummary),
      consentEnabled: merged.consentEnabled !== false && merged.consentEnabled !== "false",
      consentTitle: cleanText(merged.consentTitle, DEFAULT_SITE_CONTENT.consentTitle),
      consentBody: cleanText(merged.consentBody, DEFAULT_SITE_CONTENT.consentBody),
      consentAcceptText: cleanText(merged.consentAcceptText, DEFAULT_SITE_CONTENT.consentAcceptText),
      consentRejectText: cleanText(merged.consentRejectText, DEFAULT_SITE_CONTENT.consentRejectText),
      termsText: cleanText(merged.termsText, DEFAULT_SITE_CONTENT.termsText),
      privacyText: cleanText(merged.privacyText, DEFAULT_SITE_CONTENT.privacyText),
      cookieText: cleanText(merged.cookieText, DEFAULT_SITE_CONTENT.cookieText),
      refundText: cleanText(merged.refundText, DEFAULT_SITE_CONTENT.refundText),
      disclaimerText: cleanText(merged.disclaimerText, DEFAULT_SITE_CONTENT.disclaimerText),
    };
  }

  function cleanText(value, fallback) {
    const text = String(value || "").trim();
    return text || fallback;
  }

  function cleanEmail(value, fallback) {
    const text = String(value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : fallback;
  }

  function cleanOptionalText(value) {
    return String(value || "").trim();
  }

  function cleanMoneyNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
  }

  function cleanMinuteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 5 ? Math.round(number) : fallback;
  }

  function cleanDurationOptions(value, fallback) {
    const options = String(value || "")
      .split(",")
      .map((item) => Math.round(Number(item.trim())))
      .filter((number) => Number.isFinite(number) && number >= 5 && number <= 480);
    const unique = Array.from(new Set(options)).sort((a, b) => a - b);
    return unique.length ? unique.join(",") : fallback;
  }

  function cleanAdsClient(value) {
    const text = cleanOptionalText(value);
    const match = text.match(/(?:ca-)?pub-\d{8,}/i);
    if (!match) return "";
    const client = match[0].toLowerCase();
    return client.startsWith("ca-") ? client : `ca-${client}`;
  }

  function cleanAdSlot(value) {
    const text = cleanOptionalText(value);
    const slotFromSnippet = text.match(/data-ad-slot=["']?(\d{5,})/i);
    if (slotFromSnippet) return slotFromSnippet[1];
    const firstNumber = text.match(/\b\d{5,}\b/);
    return firstNumber ? firstNumber[0] : "";
  }

  function cleanAdSlots(value) {
    const slots = value && typeof value === "object" ? value : {};
    return {
      topBanner: cleanAdSlot(slots.topBanner),
      leftTop: cleanAdSlot(slots.leftTop),
      leftUpper: cleanAdSlot(slots.leftUpper),
      leftMiddle: cleanAdSlot(slots.leftMiddle),
      leftLower: cleanAdSlot(slots.leftLower),
      leftBottom: cleanAdSlot(slots.leftBottom),
      rightTop: cleanAdSlot(slots.rightTop),
      rightUpper: cleanAdSlot(slots.rightUpper),
      rightMiddle: cleanAdSlot(slots.rightMiddle),
      rightLower: cleanAdSlot(slots.rightLower),
      rightBottom: cleanAdSlot(slots.rightBottom),
      inlineOne: cleanAdSlot(slots.inlineOne),
      inlineTwo: cleanAdSlot(slots.inlineTwo),
      mobileChat: cleanAdSlot(slots.mobileChat),
      bottomBanner: cleanAdSlot(slots.bottomBanner),
    };
  }

  function cleanEndpoint(value, fallback) {
    const text = cleanOptionalText(value);
    if (!text) return fallback;
    if (text.startsWith("/")) return text;
    try {
      const url = new URL(text);
      return url.protocol === "https:" ? text : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function cleanOptionalUrl(value) {
    const text = cleanOptionalText(value);
    if (!text) return "";
    if (text.startsWith("/")) return text;
    try {
      const url = new URL(text);
      return url.protocol === "https:" ? text : "";
    } catch (error) {
      return "";
    }
  }

  function cleanDomain(value, fallback) {
    const text = cleanOptionalText(value).replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    return text || fallback;
  }

  function cleanUrl(value, fallback) {
    const text = String(value || "").trim();
    try {
      const url = new URL(text);
      return url.protocol === "https:" ? text : fallback;
    } catch (error) {
      return fallback;
    }
  }

  async function refreshSupabaseUser() {
    if (!state.supabase) return null;
    const { data } = await state.supabase.auth.getSession();
    state.supabaseUser = data?.session?.user || null;
    state.profile = state.supabaseUser ? await loadProfile() : null;
    await syncLanguageFromProfile();
    renderAuth();
    return state.supabaseUser;
  }

  async function loadProfile() {
    if (!state.supabase || !state.supabaseUser) return null;
    try {
      let { data, error } = await state.supabase
        .from("profiles")
        .select("id,email,role,display_name,is_disabled,disabled_reason,preferred_language")
        .eq("id", state.supabaseUser.id)
        .maybeSingle();
      if (error && /preferred_language/i.test(error.message || "")) {
        const fallback = await state.supabase
          .from("profiles")
          .select("id,email,role,display_name,is_disabled,disabled_reason")
          .eq("id", state.supabaseUser.id)
          .maybeSingle();
        data = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;
      return data || null;
    } catch (error) {
      return null;
    }
  }

  async function syncLanguageFromProfile() {
    const preferred = state.profile?.preferred_language;
    if (!SUPPORTED_LANGUAGES[preferred]) return;
    if (!state.languageWasStored) {
      await setLanguage(preferred, false);
      return;
    }
    if (preferred !== state.language) await persistLanguagePreference(state.language);
  }

  function openAuth(mode, message = "") {
    setAuthMode(mode);
    els.authMessage.textContent = message;
    els.authDialog.showModal();
    createIcons();
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    renderAuthModeLabels();
    els.authMessage.textContent = "";
  }

  function renderAuthModeLabels() {
    const mode = state.authMode;
    const isLogin = mode === "login";
    els.authTitle.textContent = isLogin ? t("nav.login") : t("nav.createAccount");
    els.authSubmitBtn.querySelector("span").textContent = isLogin ? t("nav.login") : t("nav.createAccount");
    els.switchAuthModeBtn.textContent = isLogin ? t("nav.createAccount") : t("auth.existing");
    els.authPasswordInput.autocomplete = isLogin ? "current-password" : "new-password";
    els.authPasswordInput.minLength = isLogin ? 6 : 8;
    els.forgotPasswordBtn.hidden = !isLogin;
  }

  async function requestPasswordReset() {
    const email = resolveLoginEmail(els.authEmailInput.value.trim());
    if (!email || !email.includes("@")) {
      els.authMessage.textContent = t("auth.email");
      els.authEmailInput.focus();
      return;
    }
    els.forgotPasswordBtn.disabled = true;
    els.authMessage.textContent = t("auth.resetSending");
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, language: state.language }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send the password reset email.");
      els.authMessage.textContent = data.message;
    } catch (error) {
      els.authMessage.textContent = error.message || "Could not send the password reset email.";
    } finally {
      els.forgotPasswordBtn.disabled = false;
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!state.supabase) {
      await connectSupabase();
    }
    if (!state.supabase) {
      els.authMessage.textContent = "Add Supabase URL and anon key in Integrations first.";
      return;
    }

    const loginId = els.authEmailInput.value.trim();
    const password = els.authPasswordInput.value;
    els.authSubmitBtn.disabled = true;
    els.authMessage.textContent = state.authMode === "login" ? t("auth.loggingIn") : t("auth.creating");

    try {
      if (state.authMode === "login") {
        const { error } = await state.supabase.auth.signInWithPassword({ email: resolveLoginEmail(loginId), password });
        if (error) throw error;
        await refreshSupabaseUser();
        await loadSupabaseConversations();
        await loadDiagnosticCases();
        await loadBookings();
        els.authDialog.close();
      } else {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: loginId,
            password,
            language: state.language,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not create the account.");
        els.authMessage.textContent = data.message || t("auth.verify");
      }
      renderAll();
      renderAds();
    } catch (error) {
      els.authMessage.textContent = error.message || "Authentication failed.";
    } finally {
      els.authSubmitBtn.disabled = false;
    }
  }

  async function signOut() {
    if (state.supabase) {
      await state.supabase.auth.signOut();
    }
    state.supabaseUser = null;
    state.profile = null;
    state.entitlements = {
      plan: "free",
      status: "active",
      isAdmin: false,
      isDisabled: false,
      showAds: true,
      aiMessagesUsedToday: 0,
      aiMessagesDailyLimit: 10,
      activeCases: 0,
      activeCaseLimit: 3,
      canSendAiMessage: true,
      canCreateCase: true,
    };
    state.uploads = [];
    state.recommendations = [];
    state.bookings = [];
    loadLocalConversations();
    if (!state.conversations.length) createConversation(false);
    state.activeId = state.conversations[0].id;
    state.vehicle = { ...(currentConversation()?.vehicle || {}) };
    renderAll();
    renderAds();
  }

  async function loadSupabaseConversations() {
    if (!state.supabase || !state.supabaseUser) return;
    try {
      const { data, error } = await state.supabase
        .from("conversations")
        .select("id,title,vehicle,messages,brief,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        state.conversations = data.map(fromSupabaseRow);
        state.activeId = state.conversations[0].id;
        state.vehicle = { ...(state.conversations[0].vehicle || {}) };
        persistLocal();
      }
    } catch (error) {
      renderStatus();
    }
  }

  async function refreshCurrentConversation(renderAfter = false) {
    const conversation = currentConversation();
    if (!state.supabase || !state.supabaseUser || !conversation || !isUuid(conversation.id)) return false;
    try {
      const { data, error } = await state.supabase
        .from("conversations")
        .select("id,title,vehicle,messages,brief,created_at,updated_at")
        .eq("id", conversation.id)
        .maybeSingle();
      if (error || !data) return false;
      const index = state.conversations.findIndex((item) => item.id === conversation.id);
      const remoteConversation = fromSupabaseRow(data);
      if (index >= 0) {
        state.conversations[index] = remoteConversation;
      } else {
        state.conversations.unshift(remoteConversation);
      }
      state.activeId = remoteConversation.id;
      state.vehicle = { ...(remoteConversation.vehicle || {}) };
      persistLocal();
      if (renderAfter) renderAll();
      return true;
    } catch (error) {
      return false;
    }
  }

  function startTextChatPolling() {
    window.setInterval(async () => {
      const conversation = currentConversation();
      if (conversation?.source === "diagnostic" && ["waiting_for_mechanic", "assigned"].includes(conversation.status)) {
        await loadDiagnosticCase(conversation.id, true);
        return;
      }
      if (!isTechnicianTextMode()) return;
      await refreshCurrentConversation(true);
    }, 10000);
  }

  async function saveCurrentConversation() {
    const conversation = currentConversation();
    if (!conversation || state.saving) return;
    persistLocal();
    if (!state.supabase || !state.supabaseUser) return;
    state.saving = true;
    try {
      const payload = {
        owner_id: state.supabaseUser.id,
        session_id: getSessionId(),
        title: conversation.title,
        vehicle: conversation.vehicle || {},
        messages: conversation.messages || [],
        brief: conversation.brief || "",
        updated_at: new Date().toISOString(),
      };
      if (isUuid(conversation.id) && conversation.source === "supabase") {
        const { error } = await state.supabase.from("conversations").update(payload).eq("id", conversation.id);
        if (error) throw error;
      } else {
        const { data, error } = await state.supabase.from("conversations").insert(payload).select().single();
        if (error) throw error;
        const index = state.conversations.findIndex((item) => item.id === conversation.id);
        const remoteConversation = fromSupabaseRow(data);
        if (index >= 0) state.conversations[index] = remoteConversation;
        state.activeId = remoteConversation.id;
      }
      persistLocal();
      renderConversations();
    } catch (error) {
      renderStatus();
    } finally {
      state.saving = false;
    }
  }

  function fromSupabaseRow(row) {
    const diagnostic =
      row.vehicle?.diagnostic && typeof row.vehicle.diagnostic === "object" && !Array.isArray(row.vehicle.diagnostic)
        ? row.vehicle.diagnostic
        : {};
    return {
      id: row.id,
      title: row.title || "Mechanic case",
      vehicle: row.vehicle || {},
      messages: Array.isArray(row.messages) ? row.messages : [],
      brief: row.brief || "",
      status: row.status || diagnostic.status || "ai_intake",
      priority: row.priority || diagnostic.priority || "normal",
      assignedMechanicId: row.assigned_mechanic_id || "",
      lastCustomerMessageAt: row.last_customer_message_at || "",
      lastStaffMessageAt: row.last_staff_message_at || "",
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      source: "supabase",
    };
  }

  function renderAll() {
    applyTranslations();
    renderAuthModeLabels();
    renderAuth();
    renderTechnicianProfile();
    renderConversations();
    renderMessages();
    renderVehicleDetails();
    renderPlanStatus();
    renderUploads();
    renderRecommendations();
    renderBooking();
    renderLiveSessions();
    renderStatus();
    renderConsent();
    createIcons();
  }

  function renderTechnicianProfile() {
    if (!els.technicianAvatar) return;
    const content = state.siteContent || DEFAULT_SITE_CONTENT;
    if (els.technicianAvatar.tagName === "IMG") {
      els.technicianAvatar.src = content.technicianAvatar || DEFAULT_SITE_CONTENT.technicianAvatar;
      els.technicianAvatar.alt = `${assistantName()} profile`;
    }
    els.technicianNameTitle.textContent = assistantName();
    els.technicianStats.textContent = t("profile.stats");
    els.technicianExperience.textContent = t("profile.experience");
    if (els.onlineCopy) {
      els.onlineCopy.textContent = t("chat.available");
    }
    if (els.contactNavLink) {
      els.contactNavLink.href = `mailto:${content.supportEmail || DEFAULT_SITE_CONTENT.supportEmail}`;
    }
  }

  function renderConsent() {
    if (!els.consentBanner) return;
    const content = state.siteContent || DEFAULT_SITE_CONTENT;
    els.consentTitle.textContent = localizedSiteCopy("consentTitle", "consent.title");
    els.consentBody.textContent = localizedSiteCopy("consentBody", "consent.body");
    els.consentAcceptBtn.textContent = localizedSiteCopy("consentAcceptText", "consent.accept");
    els.consentRejectBtn.textContent = localizedSiteCopy("consentRejectText", "consent.essential");
    const planShowsAds = !state.supabaseUser || state.entitlements.showAds !== false;
    els.consentBanner.hidden = !content.consentEnabled || !planShowsAds || Boolean(loadConsent());
  }

  function saveConsent(value) {
    localStorage.setItem(STORAGE.consent, value);
    renderConsent();
    renderAds();
  }

  function loadConsent() {
    return localStorage.getItem(STORAGE.consent) || "";
  }

  function canRenderAds() {
    const planAllowsAds = !state.supabaseUser || state.entitlements.showAds !== false;
    return planAllowsAds && (!state.siteContent.consentEnabled || loadConsent() === "ads");
  }

  function renderAuth() {
    const isAdmin = Boolean(state.supabaseUser && state.profile?.id === state.supabaseUser.id && state.profile?.role === "admin");
    els.adminNavBtn.hidden = !isAdmin;
    els.adminNavBtn.disabled = !isAdmin;
    els.adminNavBtn.textContent = t("nav.admin");
    els.settingsBtn.hidden = !isAdmin;
    if (state.supabaseUser) {
      els.accountBadge.textContent = state.supabaseUser.email || t("account.loggedIn");
      els.loginNavBtn.hidden = true;
      els.signupNavBtn.hidden = true;
      els.logoutBtn.hidden = false;
    } else {
      els.accountBadge.textContent = t("account.loggedOut");
      els.loginNavBtn.hidden = false;
      els.signupNavBtn.hidden = false;
      els.logoutBtn.hidden = true;
    }
  }

  function resolveLoginEmail(loginId) {
    const adminUsername = state.settings.adminUsername || DEFAULT_SETTINGS.adminUsername;
    if (loginId === adminUsername) {
      return state.settings.adminEmail || DEFAULT_SETTINGS.adminEmail;
    }
    return loginId;
  }

  function renderConversations() {
    if (!state.conversations.length) {
      els.conversationList.innerHTML = `<div class="empty-state">${escapeHtml(t("cases.empty"))}</div>`;
      return;
    }
    els.conversationList.innerHTML = state.conversations
      .map((conversation) => {
        const active = conversation.id === state.activeId ? " active" : "";
        const count = conversation.messages.filter((message) => message.role === "user").length;
        const diagnosticMeta = conversation.source === "diagnostic"
          ? `${formatLabel(conversation.status || "active")} - ${[conversation.vehicle?.year, conversation.vehicle?.make, conversation.vehicle?.model].filter(Boolean).join(" ")}`
          : `${count} driver ${count === 1 ? "note" : "notes"}`;
        return `
          <button class="conversation-item${active}" type="button" data-conversation-id="${escapeAttr(conversation.id)}">
            <span class="conversation-title">${escapeHtml(conversation.title)}</span>
            <span class="conversation-meta">${escapeHtml(diagnosticMeta)} - ${relativeTime(conversation.updatedAt)}</span>
          </button>
        `;
      })
      .join("");

    Array.from(els.conversationList.querySelectorAll("[data-conversation-id]")).forEach((button) => {
      button.addEventListener("click", async () => {
        const conversationId = button.dataset.conversationId;
        const target = state.conversations.find((conversation) => conversation.id === conversationId);
        state.activeId = conversationId;
        if (target?.source === "diagnostic") {
          await loadDiagnosticCase(conversationId);
          return;
        }
        state.uploads = [];
        state.recommendations = [];
        state.vehicle = { ...(target?.vehicle || {}) };
        renderAll();
      });
    });
  }

  function renderMessages() {
    const conversation = currentConversation();
    const messages = conversation?.messages || [];
    if (!messages.length) {
      const emptyCopy = state.platformError
        ? state.platformError
        : state.supabaseUser
          ? t("chat.emptyLoggedIn")
          : t("chat.emptyLoggedOut");
      els.messages.innerHTML = `<div class="empty-state chat-empty-state">${escapeHtml(emptyCopy)}</div>`;
      return;
    }
    els.messages.innerHTML = messages
      .map((message) => {
        const role = message.role === "user" ? "user" : "assistant";
        const alert = message.alert ? " alert" : "";
        const handoff = message.handoff ? " handoff" : "";
        const system = message.systemMessage ? " system" : "";
        const avatar = role === "user" ? t("common.you") : message.technicianReply ? "Tech" : assistantAvatarText();
        const name = role === "user" ? t("common.you") : message.systemMessage ? t("common.caseSetup") : message.name || (message.technicianReply ? state.siteContent.technicianName : assistantName());
        return `
          <article class="message ${role}${alert}${handoff}${system}">
            <div class="avatar" aria-hidden="true">${escapeHtml(avatar)}</div>
            <div class="message-body">
              <div class="message-name">${escapeHtml(name)}</div>
              <div class="bubble">${escapeHtml(message.content)}</div>
              <div class="message-time">${formatTime(message.createdAt)}</div>
            </div>
          </article>
        `;
      })
      .join("");

    if (state.typing) {
      els.messages.insertAdjacentHTML(
        "beforeend",
        `<article class="message assistant typing"><div class="avatar" aria-hidden="true">${escapeHtml(assistantAvatarText())}</div><div class="message-body"><div class="message-name">${escapeHtml(assistantName())}</div><div class="bubble">${escapeHtml(localizedSiteCopy("typingMessage", "chat.typing"))}</div></div></article>`
      );
    }
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function renderVehicleDetails() {
    const conversation = currentConversation();
    const diagnostic = conversation?.caseData;
    const details = diagnostic
      ? [
          [t("vehicle.year"), state.vehicle.year || t("common.unknown")],
          [t("vehicle.make"), state.vehicle.make || t("common.unknown")],
          [t("vehicle.model"), state.vehicle.model || t("common.unknown")],
          [t("vehicle.engine"), state.vehicle.engine || t("common.unknown")],
          [t("vehicle.fuel"), formatLabel(state.vehicle.fuelType || "unknown")],
          [t("vehicle.gearbox"), formatLabel(state.vehicle.gearbox || "unknown")],
          ["VIN", state.vehicle.vin || t("common.notSupplied")],
          ["ECU", state.vehicle.ecu || t("common.notSupplied")],
          [t("vehicle.dtcCodes"), diagnostic.dtc_codes?.length ? diagnostic.dtc_codes.join(", ") : t("common.noneSupplied")],
          [t("vehicle.priority"), formatLabel(diagnostic.priority || "normal")],
        ]
      : [
          [t("vehicle.year"), state.vehicle.year || t("common.unknown")],
          [t("vehicle.make"), state.vehicle.make || t("common.unknown")],
          [t("vehicle.model"), state.vehicle.model || t("common.unknown")],
          [t("vehicle.mileage"), state.vehicle.mileage || t("common.unknown")],
          [t("vehicle.area"), state.vehicle.category || t("common.notSupplied")],
          [t("vehicle.brief"), conversation?.brief ? t("common.saved") : t("common.pending")],
        ];
    els.vehicleDetails.innerHTML = details
      .map(
        ([label, value]) => `
          <div class="vehicle-tile">
            <span class="vehicle-label">${escapeHtml(label)}</span>
            <span class="vehicle-value">${escapeHtml(value)}</span>
          </div>
        `
      )
      .join("");
    if (els.caseStatusPill) {
      els.caseStatusPill.textContent = diagnostic ? customerCaseStatus(diagnostic.status || "active") : t("case.draft");
      els.caseStatusPill.className = `case-status-pill ${diagnostic?.priority === "urgent" ? "urgent" : ""}`;
    }
  }

  function renderPlanStatus() {
    if (!els.planStrip) return;
    els.planStrip.hidden = !state.supabaseUser;
    if (!state.supabaseUser) return;
    const entitlements = state.entitlements;
    els.planBadge.textContent = formatLabel(entitlements.plan || "free");
    els.planBadge.className = `plan-badge ${entitlements.plan || "free"}`;
    els.premiumBtn.hidden = entitlements.plan === "admin";
    els.premiumBtn.disabled = false;
    if (!els.premiumBtn.hidden) {
      els.premiumBtn.querySelector("span").textContent = entitlements.plan === "premium" ? t("plan.manageBilling") : t("plan.goPremium");
      const icon = els.premiumBtn.querySelector("i");
      if (icon) icon.setAttribute("data-lucide", entitlements.plan === "premium" ? "credit-card" : "crown");
    }
    if (entitlements.isDisabled) {
      els.planUsageCopy.textContent = t("plan.disabled");
      els.usageMeterFill.style.width = "100%";
      return;
    }
    if (entitlements.aiMessagesDailyLimit === null) {
      els.planUsageCopy.textContent = t("plan.unlimited");
      els.usageMeterFill.style.width = "0%";
      return;
    }
    const used = Number(entitlements.aiMessagesUsedToday || 0);
    const limit = Number(entitlements.aiMessagesDailyLimit || 0);
    els.planUsageCopy.textContent = t("plan.usage", { used, limit });
    els.usageMeterFill.style.width = `${Math.min(100, limit ? (used / limit) * 100 : 0)}%`;
  }

  function renderUploads() {
    if (!els.caseUploadsPanel) return;
    const diagnostic = isDiagnosticCase();
    els.caseUploadsPanel.hidden = !diagnostic;
    if (!diagnostic) return;
    if (!state.uploads.length) {
      els.caseUploadList.innerHTML = `<div class="empty-state compact">${escapeHtml(t("uploads.empty"))}</div>`;
      return;
    }
    els.caseUploadList.innerHTML = state.uploads
      .map(
        (upload) => `
          <article class="upload-row">
            <i data-lucide="${uploadIcon(upload.upload_kind)}"></i>
            <div>
              <strong>${escapeHtml(upload.file_name || "Diagnostic file")}</strong>
              <span>${escapeHtml(formatLabel(upload.upload_kind || "file"))} - ${escapeHtml(formatFileSize(upload.size_bytes))} - ${escapeHtml(formatLabel(upload.analysis_status || "stored"))}</span>
              ${upload.analysis_summary ? `<span>${escapeHtml(upload.analysis_summary)}</span>` : ""}
              ${upload.analysis_error ? `<span class="error-copy">${escapeHtml(upload.analysis_error)}</span>` : ""}
            </div>
            ${upload.download_url ? `<a class="icon-link dark" href="${escapeAttr(upload.download_url)}" target="_blank" rel="noopener" title="Open file" aria-label="Open ${escapeAttr(upload.file_name || "file")}"><i data-lucide="external-link"></i></a>` : ""}
          </article>
        `
      )
      .join("");
  }

  function renderRecommendations() {
    if (!els.recommendationsPanel) return;
    const diagnostic = isDiagnosticCase();
    els.recommendationsPanel.hidden = !diagnostic;
    if (!diagnostic) return;
    if (!state.recommendations.length) {
      els.recommendationList.innerHTML = `<div class="empty-state compact">${escapeHtml(t("tools.empty"))}</div>`;
      return;
    }
    els.recommendationList.innerHTML = state.recommendations
      .map(
        (tool) => `
          <article class="recommendation-row">
            <div class="recommendation-icon"><i data-lucide="${toolIcon(tool.category)}"></i></div>
            <div>
              <strong>${escapeHtml(tool.name)}</strong>
              <span>${escapeHtml(tool.description)}</span>
              <small>${escapeHtml(tool.match_reason || t("tools.relevant"))}</small>
            </div>
            <a class="secondary-button" href="${escapeAttr(tool.affiliate_url)}" target="_blank" rel="sponsored nofollow noopener">
              <span>${escapeHtml(t("common.viewTool"))}</span>
              <i data-lucide="external-link"></i>
            </a>
          </article>
        `
      )
      .join("");
  }

  function renderLiveSessions() {
    if (!els.liveSessionsPanel) return;
    els.liveSessionsPanel.hidden = !state.supabaseUser || !state.bookings.length;
    if (els.liveSessionsPanel.hidden) return;
    els.liveSessionsList.innerHTML = state.bookings
      .map((booking) => {
        const scheduled = booking.scheduled_start_at ? formatDate(booking.scheduled_start_at) : "Starts after payment confirmation";
        const stateLabel = booking.can_join ? "Room open" : formatLabel(booking.status || booking.payment_status || "pending");
        return `
          <article class="session-row">
            <div>
              <strong>${escapeHtml(capitalize(booking.call_type || "live"))} session - ${escapeHtml(stateLabel)}</strong>
              <span>${escapeHtml(scheduled)} - ${escapeHtml(String(booking.duration_minutes || 0))} minutes - $${escapeHtml(Number(booking.total_usd || 0).toFixed(2))}</span>
            </div>
            ${
              booking.can_join
                ? `<button class="secondary-button" type="button" data-join-booking="${escapeAttr(booking.id)}"><i data-lucide="log-in"></i><span>${escapeHtml(t("common.join"))}</span></button>`
                : `<span class="case-status-pill">${escapeHtml(stateLabel)}</span>`
            }
          </article>
        `;
      })
      .join("");
  }

  function renderBooking() {
    const reviewRequired = isHumanReviewRequired();
    if (els.escalationPanel) els.escalationPanel.hidden = !reviewRequired;
    const chatSubmitLabel = els.chatForm?.querySelector("button[type='submit'] span");
    if (els.messageInput) {
      els.messageInput.placeholder = reviewRequired ? t("chat.reviewPlaceholder") : t("chat.placeholder");
    }
    if (chatSubmitLabel) chatSubmitLabel.textContent = reviewRequired ? t("chat.sendUpdate") : t("chat.start");
    if (els.onlineCopy && reviewRequired) els.onlineCopy.textContent = t("chat.reviewQueue");
    if (!reviewRequired) return;
    const isTextChat = state.callType === "text";
    syncDurationOptions();
    els.callOptions.forEach((button) => {
      const active = button.dataset.callType === state.callType;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      const price = button.querySelector("strong");
      if (price && button.dataset.callType === "video") price.textContent = `$${state.siteContent.videoRateUsd}/hr`;
      if (price && button.dataset.callType === "voice") price.textContent = `$${state.siteContent.voiceRateUsd}/hr`;
    });
    els.bookingControls.hidden = isTextChat;
    els.scheduleControls.hidden = isTextChat;
    const duration = isTextChat ? 0 : Number(els.durationSelect.value || 60);
    const rate = rateForCallType(state.callType);
    const total = (rate * duration) / 60;
    els.bookingPrice.textContent = isTextChat ? t("common.free") : `$${total.toFixed(2)}`;
    els.bookingBtn.querySelector("span").textContent = isTextChat ? t("review.textQueued") : t("review.reserveSpecialist");
    els.bookingBtn.disabled = isTextChat;
  }

  function renderCheckoutReturnNotice() {
    if (state.checkoutNoticeShown || !els.bookingResult) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const billing = params.get("billing");
    if (!checkout && !billing) return;
    state.checkoutNoticeShown = true;
    els.bookingResult.hidden = false;
    els.siteNotice.hidden = false;
    if (billing === "success") {
      els.siteNotice.textContent = "Premium checkout completed. Stripe is confirming your subscription now.";
      els.bookingResult.innerHTML = `
        <strong>Premium checkout completed.</strong><br>
        Stripe is confirming the subscription. Your plan will update automatically.
      `;
    } else if (billing === "cancelled") {
      els.siteNotice.textContent = "Premium checkout was cancelled. Your current plan has not changed.";
      els.bookingResult.innerHTML = `
        <strong>Premium checkout cancelled.</strong><br>
        Your current plan has not changed.
      `;
    } else if (checkout === "success") {
      const callType = params.get("call") === "voice" ? "voice" : "video";
      els.siteNotice.textContent = `${capitalize(callType)} payment submitted. The room unlocks after Stripe confirms it.`;
      els.bookingResult.innerHTML = `
        <strong>Payment submitted.</strong><br>
        Your ${escapeHtml(callType)} booking will unlock after Stripe confirms payment. Check Live sessions for its status.
      `;
    } else {
      els.siteNotice.textContent = "Checkout was cancelled. No paid booking was completed.";
      els.bookingResult.innerHTML = `
        <strong>Checkout cancelled.</strong><br>
        No paid booking was completed.
      `;
    }
    params.delete("checkout");
    params.delete("call");
    params.delete("booking");
    params.delete("billing");
    const cleanQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);
    Promise.all([loadBookings(), loadDiagnosticCases()]).then(() => {
      renderAll();
      renderAds();
    });
    window.setTimeout(() => {
      els.siteNotice.hidden = true;
    }, 9000);
  }

  function syncDurationOptions() {
    if (!els.durationSelect) return;
    const options = durationOptions();
    const current = Number(els.durationSelect.value || 0);
    const signature = options.join(",");
    if (els.durationSelect.dataset.optionsSignature === signature) return;
    els.durationSelect.dataset.optionsSignature = signature;
    els.durationSelect.innerHTML = options
      .map((minutes) => `<option value="${minutes}">${durationLabel(minutes)}</option>`)
      .join("");
    els.durationSelect.value = String(options.includes(current) ? current : options[0]);
  }

  function renderStatus() {
    const rows = [
      ["Supabase", Boolean(state.supabase && state.supabaseUser)],
      ["Routera", Boolean(state.settings.routeraEndpoint || DEFAULT_SETTINGS.routeraEndpoint)],
      ["Ads", Boolean(state.settings.adsClient && hasAnyAdSlot())],
      ["Checkout", Boolean(state.settings.checkoutUrl)],
    ];
    els.integrationStatus.innerHTML = rows
      .map((row) => `<span class="status-pill">${row[0]} <b>${row[1] ? "Connected" : "Missing"}</b></span>`)
      .join("");
  }

  function renderAds() {
    const mounts = els.adMounts || [];
    const adsAllowed = canRenderAds();
    mounts.forEach((mount) => {
      mount.hidden = !adsAllowed;
    });
    if (!adsAllowed) return;
    if (!state.settings.adsClient || !hasAnyAdSlot()) {
      mounts.forEach((mount) => {
        mount.innerHTML = `<span>${escapeHtml(t("ad.label"))}</span>`;
      });
      return;
    }
    const scriptId = "adsbygoogle-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(state.settings.adsClient)}`;
      document.head.appendChild(script);
    }
    mounts.forEach((mount) => {
      const slot = adSlotForMount(mount);
      if (!slot) {
        mount.innerHTML = `<span>${escapeHtml(t("ad.label"))}</span>`;
        return;
      }
      mount.innerHTML = "";
      const ad = document.createElement("ins");
      ad.className = "adsbygoogle";
      ad.style.display = "block";
      ad.dataset.adClient = state.settings.adsClient;
      ad.dataset.adSlot = slot;
      ad.dataset.adFormat = "auto";
      ad.dataset.fullWidthResponsive = "true";
      mount.appendChild(ad);
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (error) {
        mount.innerHTML = `<span>${escapeHtml(t("ad.label"))}</span>`;
      }
    });
  }

  function hasAnyAdSlot() {
    return Boolean(state.settings.adsSlot || Object.values(state.settings.adSlots || {}).some(Boolean));
  }

  function adSlotForMount(mount) {
    const key = adSlotKey(mount.dataset.adSlot || "");
    return (state.settings.adSlots && state.settings.adSlots[key]) || state.settings.adsSlot || "";
  }

  function adSlotKey(value) {
    return String(value || "").replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
  }

  function rateForCallType(callType) {
    if (callType === "video") return Number(state.siteContent.videoRateUsd || DEFAULT_SITE_CONTENT.videoRateUsd);
    if (callType === "voice") return Number(state.siteContent.voiceRateUsd || DEFAULT_SITE_CONTENT.voiceRateUsd);
    return 0;
  }

  function durationOptions() {
    const options = String(state.siteContent.durationOptions || DEFAULT_SITE_CONTENT.durationOptions)
      .split(",")
      .map((item) => Math.round(Number(item.trim())))
      .filter((number) => Number.isFinite(number) && number >= state.siteContent.minimumCallMinutes && number <= state.siteContent.maximumCallMinutes);
    return options.length ? options : [DEFAULT_SITE_CONTENT.minimumCallMinutes, 60].filter((value, index, list) => list.indexOf(value) === index);
  }

  function durationLabel(minutes) {
    if (minutes === 60) return t("duration.hour");
    if (minutes % 60 === 0) return t("duration.hours", { hours: minutes / 60 });
    return t("duration.minutes", { minutes });
  }

  function isTechnicianTextMode(conversation = currentConversation()) {
    return Boolean((conversation?.messages || []).some((message) => message.technicianText));
  }

  function isHumanReviewRequired(conversation = currentConversation()) {
    if (!conversation) return false;
    if (["waiting_for_mechanic", "assigned"].includes(conversation.status)) return true;
    return Boolean((conversation.messages || []).some((message) => message.escalationRequired));
  }

  function customerCaseStatus(status) {
    return t(`status.${status}`) || formatLabel(status || "active");
  }

  function conversationStatus(conversation) {
    if (conversation.status === "closed") return "closed";
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    if (messages.some((message) => message.technicianReply)) return "answered";
    if (isTechnicianTextMode(conversation)) return conversation.status === "assigned" ? "assigned" : "waiting_for_mechanic";
    if (conversation.brief || messages.some((message) => message.handoff)) return "waiting_for_mechanic";
    return "ai_intake";
  }

  function conversationPriority(conversation) {
    if (conversation.priority && ["low", "normal", "urgent"].includes(conversation.priority)) return conversation.priority;
    const text = [
      conversation.brief || "",
      ...(Array.isArray(conversation.messages) ? conversation.messages.map((message) => message.content || "") : []),
    ].join(" ");
    return /brake loss|no brakes|fuel smell|smoke|fire|overheat|oil pressure|steering loss|unsafe/i.test(text) ? "urgent" : "normal";
  }

  function lastMessageTime(conversation, role) {
    return [...(conversation.messages || [])].reverse().find((message) => message.role === role)?.createdAt || null;
  }

  function lastStaffMessageTime(conversation) {
    return [...(conversation.messages || [])].reverse().find((message) => message.technicianReply || (message.role === "assistant" && message.technicianText))?.createdAt || null;
  }

  function loadLocalConversations() {
    try {
      state.conversations = JSON.parse(localStorage.getItem(STORAGE.conversations) || "[]");
      state.conversations.forEach((conversation) => {
        (conversation.messages || []).forEach((message) => {
          if (/chatbot|Gemini Diagnostic AI|DiagnosticaOnline AI/i.test(message.name || "")) {
            message.name = assistantName();
          }
          if (
            message.role === "assistant" &&
            (message.content === "Welcome! What's going on with your car?" || /diagnostic intake assistant|I'm your AI mechanic/i.test(message.content || ""))
          ) {
            message.content = state.siteContent.welcomeMessage;
          }
        });
      });
    } catch (error) {
      state.conversations = [];
    }
  }

  function persistLocal() {
    localStorage.setItem(STORAGE.conversations, JSON.stringify(state.conversations.slice(0, 40)));
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE.settings) || "{}");
      return {
        ...DEFAULT_SETTINGS,
        ...saved,
        routeraEndpoint: saved.routeraEndpoint || saved.geminiEndpoint || DEFAULT_SETTINGS.routeraEndpoint,
        routeraModel: saved.routeraModel || saved.geminiModel || DEFAULT_SETTINGS.routeraModel,
      };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function fillSettingsForm() {
    els.supabaseUrlInput.value = state.settings.supabaseUrl || "";
    els.supabaseAnonInput.value = state.settings.supabaseAnonKey || "";
    els.routeraEndpointInput.value = state.settings.routeraEndpoint || DEFAULT_SETTINGS.routeraEndpoint;
    els.routeraModelInput.value = state.settings.routeraModel || DEFAULT_SETTINGS.routeraModel;
    els.adsClientInput.value = state.settings.adsClient || "";
    els.adsSlotInput.value = state.settings.adsSlot || "";
    els.checkoutUrlInput.value = state.settings.checkoutUrl || "";
    els.jitsiDomainInput.value = state.settings.jitsiDomain || DEFAULT_SETTINGS.jitsiDomain;
  }

  function saveSettingsFromForm() {
    state.settings = {
      supabaseUrl: els.supabaseUrlInput.value.trim(),
      supabaseAnonKey: els.supabaseAnonInput.value.trim(),
      routeraEndpoint: els.routeraEndpointInput.value.trim() || DEFAULT_SETTINGS.routeraEndpoint,
      routeraModel: els.routeraModelInput.value.trim() || DEFAULT_SETTINGS.routeraModel,
      adsClient: cleanAdsClient(els.adsClientInput.value),
      adsSlot: cleanAdSlot(els.adsSlotInput.value),
      adSlots: state.settings.adSlots || DEFAULT_SETTINGS.adSlots,
      checkoutUrl: els.checkoutUrlInput.value.trim(),
      jitsiDomain: els.jitsiDomainInput.value.trim() || DEFAULT_SETTINGS.jitsiDomain,
    };
    localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
  }

  function currentConversation() {
    return state.conversations.find((conversation) => conversation.id === state.activeId);
  }

  function getSessionId() {
    let id = localStorage.getItem(STORAGE.session);
    if (!id) {
      id = newId();
      localStorage.setItem(STORAGE.session, id);
    }
    return id;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function titleFromText(text) {
    return text.replace(/\s+/g, " ").slice(0, 64) || "Mechanic case";
  }

  function newId() {
    return window.crypto?.randomUUID ? window.crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function relativeTime(value) {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.round(diff / 60000);
    const locale = SUPPORTED_LANGUAGES[state.language]?.htmlLang || "en";
    const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" });
    if (minutes < 60) return formatter.format(-Math.max(0, minutes), "minute");
    const hours = Math.round(minutes / 60);
    if (hours < 24) return formatter.format(-hours, "hour");
    const days = Math.round(hours / 24);
    return formatter.format(-days, "day");
  }

  function formatTime(value) {
    return new Intl.DateTimeFormat(SUPPORTED_LANGUAGES[state.language]?.htmlLang || "en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat(SUPPORTED_LANGUAGES[state.language]?.htmlLang || "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function formatLabel(value) {
    const normalized = String(value || "").toLowerCase();
    const translationKeys = {
      petrol: "fuel.petrol",
      diesel: "fuel.diesel",
      hybrid: "fuel.hybrid",
      electric: "fuel.electric",
      manual: "gearbox.manual",
      automatic: "gearbox.automatic",
      single_speed: "gearbox.singleSpeed",
      other: "common.other",
      unknown: "common.unknown",
      active: "status.active",
      waiting_for_mechanic: "status.waiting_for_mechanic",
      assigned: "status.assigned",
      resolved: "status.resolved",
      archived: "status.archived",
    };
    if (translationKeys[normalized]) return t(translationKeys[normalized]);
    return String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatFileSize(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function uploadIcon(kind) {
    if (kind === "image") return "image";
    if (kind === "pdf") return "file-text";
    if (kind === "ecu_binary") return "binary";
    if (kind === "obd_scan") return "scan-line";
    return "file-code-2";
  }

  function toolIcon(category) {
    if (category === "multimeter") return "gauge";
    if (category === "repair_manual") return "book-open-check";
    if (category === "smoke_tester") return "wind";
    if (category === "vacuum_pump") return "circle-gauge";
    if (category === "obd_scanner" || category === "scan_tool") return "scan-line";
    return "wrench";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  function createIcons() {
    if (window.lucide) window.lucide.createIcons();
  }
})();
