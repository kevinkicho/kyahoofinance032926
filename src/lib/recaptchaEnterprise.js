const RECAPTCHA_SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ||
  '6Ldl3yYtAAAAAAmHpuYyoj1qMJyfrvlQFZNjf08f';

let scriptPromise = null;

function loadRecaptchaScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('reCAPTCHA requires a browser'));
  if (window.grecaptcha?.enterprise) return Promise.resolve(window.grecaptcha);

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-recaptcha-enterprise="${RECAPTCHA_SITE_KEY}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.grecaptcha), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
      script.async = true;
      script.defer = true;
      script.dataset.recaptchaEnterprise = RECAPTCHA_SITE_KEY;
      script.onload = () => resolve(window.grecaptcha);
      script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

export async function getRecaptchaEnterpriseToken(action) {
  if (!RECAPTCHA_SITE_KEY) return null;
  const grecaptcha = await loadRecaptchaScript();
  await new Promise(resolve => grecaptcha.enterprise.ready(resolve));
  return grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });
}

