import crypto from 'crypto';

// Используем PBKDF2 (встроено в Node.js) для хэширования паролей
// В production лучше использовать bcrypt или argon2

const SALT_LENGTH = 32;
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export const password = {
  /**
   * Хэширует пароль
   */
  hash: async (password: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');

      crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
        if (err) reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      });
    });
  },

  /**
   * Проверяет пароль
   */
  verify: async (password: string, hash: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const [salt, key] = hash.split(':');

      crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
        if (err) reject(err);
        resolve(key === derivedKey.toString('hex'));
      });
    });
  },

  /**
   * Проверяет силу пароля
   */
  strength: (password: string): { valid: boolean; score: number; feedback: string[] } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Минимум 8 символов');
    } else if (password.length >= 8) {
      score += 1;
    }
    if (password.length >= 12) {
      score += 1;
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Добавьте строчные буквы');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Добавьте заглавные буквы');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Добавьте цифры');
    }

    if (/[^a-zA-Z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Добавьте специальные символы (!@#$%^&*)');
    }

    // Проверка на распространенные пароли
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      feedback.push('Слишком простой пароль');
      score = Math.max(0, score - 2);
    }

    return {
      valid: score >= 4 && password.length >= 8,
      score: Math.min(score, 6),
      feedback,
    };
  },

  /**
   * Генерирует случайный пароль
   */
  generate: (length: number = 16): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0-9!@#$%^&*';
    let password = '';
    const values = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      password += charset[values[i] % charset.length];
    }

    return password;
  },

  /**
   * Генерирует token для reset password
   */
  generateResetToken: (): string => {
    return crypto.randomBytes(32).toString('hex');
  },
};
