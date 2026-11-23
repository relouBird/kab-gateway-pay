export const fr = {
  common: {
    loading: "Chargement…",
    sending: "Envoi…",
    verifying: "Vérification…",
    cancel: "Annuler",
    retry: "Réessayer",
    language: "Langue",
    skipToContent: "Aller au contenu",
    showPassword: "Afficher le mot de passe",
    hidePassword: "Masquer le mot de passe",
    reference: "Référence :",
    theme: {
      label: "Thème",
      dark: "A · Sombre — Fleur de fils",
      light: "B · Clair — Clair doux",
      darkMode: "Sombre",
      lightMode: "Clair",
    },
  },
  brand: { tagline: "Plusieurs sources. Un seul accès." },
  connected: {
    greeting: "Bienvenue",
    customerLabel: "Espace client",
    accountDescription: "Accès sécurisé",
  },
  fields: {
    email: "Adresse e-mail",
    phone: "Téléphone",
    password: "Mot de passe",
    newPassword: "Nouveau mot de passe",
    currentPassword: "Mot de passe actuel",
    newEmail: "Nouvelle adresse e-mail",
  },
  validation: {
    email: {
      required: "Saisissez votre adresse e-mail.",
      invalid: "Saisissez une adresse e-mail valide.",
    },
    phone: {
      required: "Saisissez votre numéro de téléphone.",
      invalid: "Saisissez un numéro valide (3 à 32 caractères, chiffres et +).",
    },
    otp: {
      required: "Saisissez le code reçu par e-mail.",
      invalid: "Le code doit contenir de 6 à 10 chiffres.",
    },
    password: {
      required: "Saisissez un mot de passe.",
      tooShort: "Le mot de passe doit contenir au moins {{min}} caractères.",
      tooLong: "Le mot de passe est trop long.",
      same: "Le nouveau mot de passe doit être différent de l'actuel.",
    },
  },
  errors: {
    network:
      "Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.",
    validation:
      "Certaines informations sont invalides. Vérifiez le formulaire.",
    badRequest:
      "La demande n'a pas pu être traitée. Vérifiez les informations saisies.",
    invalidCredentials: "Adresse e-mail ou mot de passe incorrect.",
    currentPasswordIncorrect: "Le mot de passe actuel est incorrect.",
    codeInvalid:
      "Le code est invalide ou a expiré. Vérifiez-le ou demandez-en un nouveau.",
    resetFailed:
      "Le code est invalide ou a expiré, ou le mot de passe n'est pas accepté.",
    sessionExpired: "Votre session a expiré. Reconnectez-vous.",
    forbidden:
      "Cette action n'est pas autorisée ou nécessite une nouvelle confirmation.",
    sessionLimit:
      "Le nombre maximal de sessions simultanées est atteint. Déconnectez-vous d'un autre appareil puis réessayez.",
    emailUnavailable: "Cette adresse e-mail ne peut pas être utilisée.",
    conflict:
      "Cette action est en conflit avec l'état de votre compte. Actualisez la page puis réessayez.",
    tooManyRequests:
      "Trop de tentatives. Patientez quelques instants avant de réessayer.",
    emailNotSent:
      "Le code n'a pas pu être envoyé par e-mail. Réessayez dans un instant.",
    server: "Un problème est survenu de notre côté. Réessayez plus tard.",
  },
  otp: {
    code: "Code de vérification",
    codeHint: "Code à usage unique reçu par e-mail.",
    resend: "Renvoyer le code",
    resendIn_one: "Renvoyer le code ({{count}} seconde)",
    resendIn_other: "Renvoyer le code ({{count}} secondes)",
    resent: "Un nouveau code vient d'être envoyé.",
  },
  register: {
    title: "Créer votre accès",
    subtitle:
      "Créez votre identité KG Pay. Un code de vérification sera envoyé à votre e-mail.",
    phoneHint: "Contact non vérifié : il ne sert pas à récupérer votre compte.",
    passwordHint: "Au moins {{min}} caractères.",
    submit: "Créer mon accès",
    haveAccount: "Vous avez déjà un accès ?",
    login: "Se connecter",
  },
  verifyContact: {
    title: "Confirmez votre e-mail",
    subtitle:
      "Si l'adresse {{email}} peut être utilisée, un code vient de lui être envoyé. Saisissez-le pour confirmer votre e-mail.",
    submit: "Confirmer mon e-mail",
    back: "Modifier mes informations",
  },
  login: {
    title: "Connexion",
    subtitle:
      "Saisissez votre e-mail et votre mot de passe. Un code vous sera ensuite envoyé par e-mail.",
    submit: "Continuer",
    forgot: "Mot de passe oublié ?",
    noAccount: "Pas encore d'accès ?",
    register: "Créer un accès",
  },
  mfa: {
    title: "Code de connexion",
    subtitle:
      "Un code a été envoyé à {{email}}. Saisissez-le pour ouvrir votre session.",
    submit: "Ouvrir ma session",
    back: "Retour à la connexion",
  },
  forgot: {
    title: "Mot de passe oublié",
    subtitle:
      "Indiquez l'e-mail de votre compte. Si l'adresse peut être utilisée, un code de récupération vous sera envoyé.",
    submit: "Recevoir un code",
    back: "Retour à la connexion",
    lostEmail:
      "Vous n'avez plus accès à votre e-mail ? Contactez le support KG Pay : un code envoyé au téléphone ne peut pas servir à récupérer votre compte.",
  },
  reset: {
    title: "Nouveau mot de passe",
    subtitle:
      "Saisissez le code reçu à {{email}}, puis choisissez un nouveau mot de passe.",
    submit: "Enregistrer le mot de passe",
    back: "Demander un nouveau code",
  },
  flash: {
    registered:
      "Votre e-mail est confirmé. Vous pouvez maintenant vous connecter.",
    passwordReset:
      "Mot de passe mis à jour. Connectez-vous avec votre nouveau mot de passe.",
    passwordChanged:
      "Mot de passe modifié. Par sécurité, toutes vos sessions ont été fermées : reconnectez-vous.",
  },
  nav: {
    label: "Navigation principale",
    home: "Accueil",
    account: "Mon compte",
    sessions: "Sessions",
    logout: "Se déconnecter",
  },
  home: {
    title: "Bienvenue",
    subtitle: "Votre espace KG Pay.",
    identity: {
      title: "Votre identité",
      active: "Identité active",
      description:
        "Vous êtes connecté avec une identité KG Pay confirmée par e-mail et par un code à chaque connexion.",
    },
    customerFile:
      "Votre dossier client (vérification d'identité) est géré dans un autre module, pas encore disponible : une identité active n'est pas un dossier validé.",
    tiles: {
      account: {
        title: "Mon compte",
        description: "Mot de passe, e-mail et téléphone.",
      },
      sessions: {
        title: "Sessions",
        description: "Appareils connectés à votre compte.",
      },
    },
  },
  account: {
    title: "Mon compte",
    subtitle: "Gérez les informations qui protègent votre accès.",
    password: {
      title: "Mot de passe",
      description:
        "Choisissez un mot de passe que vous n'utilisez nulle part ailleurs.",
      warning:
        "Après ce changement, toutes vos sessions sont fermées et vous devez vous reconnecter.",
      submit: "Changer le mot de passe",
    },
    email: {
      title: "Adresse e-mail",
      description:
        "Un code est d'abord envoyé à votre e-mail actuel, puis un second à la nouvelle adresse.",
      submit: "Changer l'adresse e-mail",
      codeSent:
        "Un code vient d'être envoyé à {{email}}. Saisissez-le pour confirmer le changement.",
      confirm: "Confirmer la nouvelle adresse",
      done: "Votre adresse e-mail a été mise à jour.",
    },
    phone: {
      title: "Téléphone",
      description:
        "Le téléphone est un contact non vérifié. Une confirmation par code envoyé à votre e-mail actuel est requise.",
      submit: "Changer le téléphone",
      done: "Votre numéro de téléphone a été mis à jour.",
    },
  },
  stepUp: {
    title: "Confirmation de votre identité",
    intro:
      "Pour cette action sensible, nous envoyons un code à votre e-mail actuel.",
    send: "Envoyer le code",
    codeHint: "Code reçu à votre e-mail actuel.",
    confirm: "Confirmer",
  },
  sessions: {
    title: "Sessions actives",
    subtitle:
      "Appareils connectés à votre compte. Fermez ceux que vous ne reconnaissez pas.",
    current: "Session actuelle",
    unknownDevice: "Appareil inconnu",
    ip: "Adresse IP",
    createdAt: "Ouverte le",
    lastActivity: "Dernière activité",
    expiresAt: "Expire le",
    revoke: "Fermer cette session",
    signOutCurrent: "Fermer cette session (me déconnecter)",
    confirmTitle: "Confirmer la fermeture",
    confirmRevoke: "Confirmer la fermeture",
    confirmCurrent: "Confirmer ma déconnexion",
    logoutAll: {
      title: "Tous les appareils",
      description:
        "Ferme toutes vos sessions, y compris celle-ci. Vous devrez vous reconnecter.",
      submit: "Me déconnecter partout",
      confirm: "Confirmer : tout fermer",
    },
  },
  notFound: {
    title: "Page introuvable",
    subtitle: "Cette page n'existe pas ou a été déplacée.",
    back: "Retour à l'accueil",
  },
  connection: {
    "not-found": {
      eyebrow: "Erreur 404",
      title: "Cette page est introuvable.",
      message:
        "Cette adresse n’existe plus ou a été déplacée. Revenez à votre espace KG Pay.",
      action: "Retour à la connexion",
    },
    offline: {
      eyebrow: "Hors connexion",
      title: "Plus de réseau pour le moment.",
      message:
        "Votre appareil n’est plus connecté à Internet. Dès que le réseau revient, vous pourrez reprendre.",
    },
    restored: {
      eyebrow: "Connexion rétablie",
      title: "De retour. Tout est en place.",
      message:
        "Votre connexion fonctionne de nouveau. Rechargez la page pour continuer en toute sécurité.",
      action: "Recharger la page",
    },
    paymentTitle: "Un paiement était en cours ?",
    paymentNote:
      "Il a peut-être abouti avant la coupure. Ne le relancez pas avant d’avoir consulté son suivi.",
    waiting: "En attente du réseau…",
  },
};

export type Translation = typeof fr;
