import type { Translation } from "./fr";

export const en: Translation = {
  common: {
    loading: "Loading…",
    sending: "Sending…",
    verifying: "Verifying…",
    cancel: "Cancel",
    retry: "Try again",
    language: "Language",
    skipToContent: "Skip to content",
    showPassword: "Show password",
    hidePassword: "Hide password",
    reference: "Reference:",
  },
  brand: { tagline: "Many sources. One access." },
  fields: {
    email: "Email address",
    phone: "Phone",
    password: "Password",
    newPassword: "New password",
    currentPassword: "Current password",
    newEmail: "New email address",
  },
  validation: {
    email: {
      required: "Enter your email address.",
      invalid: "Enter a valid email address.",
    },
    phone: {
      required: "Enter your phone number.",
      invalid: "Enter a valid number (3 to 32 characters, digits and +).",
    },
    otp: {
      required: "Enter the code you received by email.",
      invalid: "The code must contain 6 to 10 digits.",
    },
    password: {
      required: "Enter a password.",
      tooShort: "The password must be at least {{min}} characters long.",
      tooLong: "The password is too long.",
      same: "The new password must be different from the current one.",
    },
  },
  errors: {
    network:
      "The server cannot be reached. Check your connection and try again.",
    validation: "Some information is invalid. Check the form.",
    badRequest:
      "The request could not be processed. Check the information you entered.",
    invalidCredentials: "Incorrect email address or password.",
    currentPasswordIncorrect: "The current password is incorrect.",
    codeInvalid:
      "The code is invalid or has expired. Check it or request a new one.",
    resetFailed:
      "The code is invalid or has expired, or the password is not accepted.",
    sessionExpired: "Your session has expired. Sign in again.",
    forbidden: "This action is not allowed or requires a new confirmation.",
    sessionLimit:
      "The maximum number of simultaneous sessions has been reached. Sign out from another device and try again.",
    emailUnavailable: "This email address cannot be used.",
    conflict:
      "This action conflicts with the state of your account. Refresh the page and try again.",
    tooManyRequests:
      "Too many attempts. Please wait a moment before trying again.",
    emailNotSent: "The code could not be sent by email. Try again in a moment.",
    server: "Something went wrong on our side. Please try again later.",
  },
  otp: {
    code: "Verification code",
    codeHint: "One-time code received by email.",
    resend: "Resend the code",
    resendIn_one: "Resend the code ({{count}} second)",
    resendIn_other: "Resend the code ({{count}} seconds)",
    resent: "A new code has just been sent.",
  },
  register: {
    title: "Create your access",
    subtitle:
      "Create your KG Pay identity. A verification code will be sent to your email.",
    phoneHint: "Unverified contact: it is not used to recover your account.",
    passwordHint: "At least {{min}} characters.",
    submit: "Create my access",
    haveAccount: "Already have access?",
    login: "Sign in",
  },
  verifyContact: {
    title: "Confirm your email",
    subtitle:
      "If {{email}} can be used, a code has just been sent to it. Enter it to confirm your email.",
    submit: "Confirm my email",
    back: "Edit my information",
  },
  login: {
    title: "Sign in",
    subtitle:
      "Enter your email and password. A code will then be sent to you by email.",
    submit: "Continue",
    forgot: "Forgot your password?",
    noAccount: "No access yet?",
    register: "Create an access",
  },
  mfa: {
    title: "Sign-in code",
    subtitle: "A code was sent to {{email}}. Enter it to open your session.",
    submit: "Open my session",
    back: "Back to sign in",
  },
  forgot: {
    title: "Forgot your password",
    subtitle:
      "Enter the email of your account. If the address can be used, a recovery code will be sent to you.",
    submit: "Receive a code",
    back: "Back to sign in",
    lostEmail:
      "No longer have access to your email? Contact KG Pay support: a code sent to a phone cannot be used to recover your account.",
  },
  reset: {
    title: "New password",
    subtitle:
      "Enter the code received at {{email}}, then choose a new password.",
    submit: "Save the password",
    back: "Request a new code",
  },
  flash: {
    registered: "Your email is confirmed. You can now sign in.",
    passwordReset: "Password updated. Sign in with your new password.",
    passwordChanged:
      "Password changed. For your security, all your sessions were closed: sign in again.",
  },
  nav: {
    label: "Main navigation",
    home: "Home",
    account: "My account",
    sessions: "Sessions",
    logout: "Sign out",
  },
  home: {
    title: "Welcome",
    subtitle: "Your KG Pay space.",
    identity: {
      title: "Your identity",
      active: "Active identity",
      description:
        "You are signed in with a KG Pay identity confirmed by email and by a code at each sign-in.",
    },
    customerFile:
      "Your customer file (identity verification) is handled in another module that is not available yet: an active identity is not a validated file.",
    tiles: {
      account: {
        title: "My account",
        description: "Password, email and phone.",
      },
      sessions: {
        title: "Sessions",
        description: "Devices signed in to your account.",
      },
    },
  },
  account: {
    title: "My account",
    subtitle: "Manage the information that protects your access.",
    password: {
      title: "Password",
      description: "Choose a password you do not use anywhere else.",
      warning:
        "After this change, all your sessions are closed and you must sign in again.",
      submit: "Change the password",
    },
    email: {
      title: "Email address",
      description:
        "A code is first sent to your current email, then a second one to the new address.",
      submit: "Change the email address",
      codeSent:
        "A code has just been sent to {{email}}. Enter it to confirm the change.",
      confirm: "Confirm the new address",
      done: "Your email address has been updated.",
    },
    phone: {
      title: "Phone",
      description:
        "The phone is an unverified contact. A confirmation by a code sent to your current email is required.",
      submit: "Change the phone",
      done: "Your phone number has been updated.",
    },
  },
  stepUp: {
    title: "Confirm your identity",
    intro: "For this sensitive action, we send a code to your current email.",
    send: "Send the code",
    codeHint: "Code received at your current email.",
    confirm: "Confirm",
  },
  sessions: {
    title: "Active sessions",
    subtitle:
      "Devices signed in to your account. Close the ones you do not recognize.",
    current: "Current session",
    unknownDevice: "Unknown device",
    ip: "IP address",
    createdAt: "Opened on",
    lastActivity: "Last activity",
    expiresAt: "Expires on",
    revoke: "Close this session",
    signOutCurrent: "Close this session (sign me out)",
    confirmTitle: "Confirm closing",
    confirmRevoke: "Confirm closing",
    confirmCurrent: "Confirm sign out",
    logoutAll: {
      title: "All devices",
      description:
        "Closes all your sessions, including this one. You will need to sign in again.",
      submit: "Sign me out everywhere",
      confirm: "Confirm: close everything",
    },
  },
  notFound: {
    title: "Page not found",
    subtitle: "This page does not exist or has been moved.",
    back: "Back to home",
  },
};
