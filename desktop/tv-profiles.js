import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createTvProfiles(dataDir, isValidIp) {
  const file = path.join(dataDir, 'tv-profiles.json');
  let saved = { version: 1, activeId: '', profiles: [] };
  let error = '';

  function validProfile(profile) {
    return profile && typeof profile === 'object' &&
      typeof profile.id === 'string' && /^[\w-]{1,64}$/.test(profile.id) &&
      typeof profile.name === 'string' && profile.name === profile.name.trim() &&
      profile.name.length > 0 && profile.name.length <= 64 &&
      !/[\x00-\x1f\x7f]/.test(profile.name) &&
      typeof profile.ip === 'string' && isValidIp(profile.ip) &&
      profile.ip === profile.ip.trim();
  }

  function persist(next) {
    const temporary = `${file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 });
    fs.renameSync(temporary, file);
    saved = next;
  }

  try {
    if (fs.existsSync(file)) {
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (value?.version !== 1 || !Array.isArray(value.profiles) ||
          !value.profiles.every(validProfile) ||
          new Set(value.profiles.map(p => p.id)).size !== value.profiles.length ||
          new Set(value.profiles.map(p => p.ip)).size !== value.profiles.length ||
          typeof value.activeId !== 'string' ||
          (value.activeId && !value.profiles.some(p => p.id === value.activeId)))
        throw new Error('Invalid saved profiles');
      saved = { version: 1, activeId: value.activeId,
        profiles: value.profiles.map(({ id, name, ip }) => ({ id, name, ip })) };
    } else {
      let legacy;
      try {
        legacy = JSON.parse(fs.readFileSync(path.join(dataDir, 'last-device.json'), 'utf8')).ip;
      } catch { /* A first launch has no previous address. */ }
      if (typeof legacy === 'string' && isValidIp(legacy)) {
        const profile = { id: randomUUID(), name: 'Fire TV', ip: legacy.trim() };
        persist({ version: 1, activeId: profile.id, profiles: [profile] });
      }
    }
  } catch {
    error = 'Saved TV profiles could not be read. The original file was kept. You can still connect by address.';
  }

  function requireReadable() {
    if (error) throw new Error(error);
  }

  function snapshot() {
    return { profiles: saved.profiles.map(p => ({ ...p })),
      activeProfileId: saved.activeId,
      savedIp: saved.profiles.find(p => p.id === saved.activeId)?.ip || '',
      profileError: error };
  }

  return {
    snapshot,
    select(id) {
      requireReadable();
      if (id !== '' && !saved.profiles.some(p => p.id === id))
        throw new Error('Choose a saved TV.');
      persist({ ...saved, activeId: id });
      return snapshot();
    },
    save(value) {
      requireReadable();
      if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('Enter a TV name and IPv4 address.');
      if (value.id !== undefined && typeof value.id !== 'string')
        throw new Error('Choose a saved TV or add a new TV.');
      const id = value.id || randomUUID();
      if (value.id && !saved.profiles.some(p => p.id === value.id))
        throw new Error('This saved TV no longer exists.');
      const profile = { id, name: typeof value.name === 'string' ? value.name.trim() : '',
        ip: typeof value.ip === 'string' ? value.ip.trim() : '' };
      if (!validProfile(profile))
        throw new Error('Enter a TV name of up to 64 characters and a valid IPv4 address.');
      if (saved.profiles.some(p => p.id !== id && p.ip === profile.ip))
        throw new Error('That IP address is already saved. Edit its existing TV profile.');
      const profiles = saved.profiles.map(p => p.id === id ? profile : p);
      if (!profiles.some(p => p.id === id)) profiles.push(profile);
      persist({ version: 1, activeId: id, profiles });
      return snapshot();
    },
    remove(id) {
      requireReadable();
      if (!saved.profiles.some(p => p.id === id))
        throw new Error('Choose a saved TV to remove.');
      persist({ ...saved, activeId: saved.activeId === id ? '' : saved.activeId,
        profiles: saved.profiles.filter(p => p.id !== id) });
      return snapshot();
    },
    remember(ip) {
      if (error) return;
      const existing = saved.profiles.find(p => p.ip === ip);
      if (existing) {
        this.select(existing.id);
        return;
      }
      let number = 1;
      while (saved.profiles.some(p => p.name === `Fire TV ${number}`)) number++;
      this.save({ name: `Fire TV ${number}`, ip });
    },
  };
}
