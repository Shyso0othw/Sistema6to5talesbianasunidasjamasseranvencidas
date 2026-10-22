"""Red de chat por rol.

Fuente única de verdad de con quién puede chatear cada rol.
Se usa tanto para filtrar la lista de contactos como para validar
envíos de mensajes y la composición de grupos de chat.
"""

ROLE_ALIASES = {
    'administrador': 'admin',
    'preceptoria': 'preceptor',
    'docente': 'profesor',
    'familias': 'familia',
    'directivo': 'director',
    'vicedirector': 'vicedirector',
    'secretaria': 'secretario',
    'j_preceptores': 'jefe_preceptores',
    'jefe_de_preceptores': 'jefe_preceptores',
    'eoe': 'eoe',
}

ALL_ROLES = {
    'estudiante',
    'preceptor',
    'admin',
    'profesor',
    'familia',
    'director',
    'vicedirector',
    'secretario',
    'jefe_area',
    'jefe_departamento',
    'jefe_preceptores',
    'ematp',
    'eoe',
    'bibliotecario',
    'auxiliar',
}

ROLES_EXCLUIDOS_CONTACTOS = {'admin'}

CHAT_NETWORK = {
    'admin': set(ALL_ROLES),
    'eoe': set(ALL_ROLES),
    'preceptor': set(ALL_ROLES),
    'secretario': set(ALL_ROLES),
    'director': set(ALL_ROLES) - {'familia', 'estudiante'},
    'vicedirector': set(ALL_ROLES) - {'familia', 'estudiante'},
    'jefe_area': set(ALL_ROLES) - {'familia', 'estudiante'},
    'jefe_preceptores': set(ALL_ROLES) - {'familia', 'estudiante'},
    'jefe_departamento': {'profesor', 'secretario', 'preceptor', 'jefe_area', 'jefe_preceptores', 'director', 'vicedirector', 'admin', 'eoe'},
    'profesor': {'preceptor', 'jefe_departamento', 'jefe_area', 'secretario', 'jefe_preceptores', 'director', 'vicedirector', 'admin', 'eoe'},
    'familia': {'preceptor', 'secretario', 'eoe'},
    'ematp': {'preceptor', 'secretario', 'jefe_preceptores', 'director', 'vicedirector', 'admin', 'eoe'},
    'bibliotecario': {'preceptor', 'secretario', 'jefe_preceptores', 'director', 'vicedirector', 'admin', 'eoe'},
    'auxiliar': {'preceptor', 'secretario', 'jefe_preceptores', 'director', 'vicedirector', 'admin', 'eoe'},
    'estudiante': {'preceptor'},
}


def normalize_role(nombre):
    n = (nombre or '').strip().lower()
    return ROLE_ALIASES.get(n, n)


def get_user_roles(user):
    """Devuelve el set de roles canónicos del usuario."""
    try:
        perfil = user.perfil
    except Exception:
        return set()
    return {normalize_role(r) for r in perfil.get_all_roles()}


def can_chat(remitente, destinatario):
    """¿Puede `remitente` chatear con `destinatario`? (direccional)."""
    rr = get_user_roles(remitente)
    dr = get_user_roles(destinatario)
    if not rr or not dr:
        return False
    for r in rr:
        if CHAT_NETWORK.get(r, set()).intersection(dr):
            return True
    return False


def can_chat_mutual(a, b):
    return can_chat(a, b) and can_chat(b, a)


def can_chat_group(creador, miembros):
    """¿Puede `creador` formar un grupo con estos `miembros`?

    El creador (que organiza el grupo) debe poder chatear con cada miembro;
    además, todos los miembros deben poder chatear entre sí (mutuo),
    para no romper las restricciones de la red de chat.
    """
    if not can_chat(creador, creador):
        return False
    for m in miembros:
        if not can_chat(creador, m):
            return False
    for i in range(len(miembros)):
        for j in range(i + 1, len(miembros)):
            if not can_chat_mutual(miembros[i], miembros[j]):
                return False
    return True