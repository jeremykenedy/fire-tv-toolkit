// The vetted screensavers. Each one was reviewed this way before being added
// here: pulled its latest GitHub release APK, checked its requested Android
// permissions, checked its actual network traffic and any hardcoded endpoints
// in its code, and confirmed no ads, analytics, or trackers. `repo` is under
// github.com/jeremykenedy, a fork for the third-party ones (see the Credits
// section in the README for the originals) or one of Jeremy's own, except for
// authors trusted directly. Those install from the author's own release,
// pinned by tag, asset and SHA-256 because their releases publish no checksum.

export const SCREENSAVERS = [
  {
    id: 'aerial',
    name: 'Aerial Views',
    pkg: 'com.neilturner.aerialviews',
    dreamComponent: 'com.neilturner.aerialviews/.ui.screensaver.DreamActivity',
    repo: 'theothernt/AerialViews',
    tag: '1.8.5',
    asset: 'aerial-views-1.8.5.apk',
    sha256: 'a20b4bc748da5ce890d96536494952aa4f50a6b589c50dee176415c021407070',
    blurb: 'Aerial drone footage, the Apple TV screensaver look. No ads.',
  },
  {
    id: 'black-screen-dream',
    name: 'Black Screen Dream',
    pkg: 'com.jeremykenedy.blackscreendream',
    dreamComponent: 'com.jeremykenedy.blackscreendream/.BlackScreenDreamService',
    repo: 'jeremykenedy/black-screen-dream',
    blurb: 'A plain black screen without a clock, imagery or animation.',
  },
  {
    id: 'androsaver',
    name: 'AndroSaver',
    pkg: 'com.androsaver',
    dreamComponent: 'com.androsaver/.ScreensaverService',
    repo: 'jeremykenedy/androsaver',
    blurb: 'Photo slideshow or music visualizer. No ads.',
  },
  {
    id: 'snoozy',
    name: 'Snoozy',
    pkg: 'com.overdevs.snoozy',
    dreamComponent: 'com.overdevs.snoozy/.SnoozyDreamService',
    repo: 'jeremykenedy/Snoozy',
    blurb: 'Animated Snoopy screensaver. No ads, no analytics, confirmed by its own author.',
  },
  {
    id: 'aquarium-live',
    name: 'Aquarium Live',
    pkg: 'com.jeremykenedy.aquariumlive',
    dreamComponent: 'com.jeremykenedy.aquariumlive/.AquariumDream',
    repo: 'jeremykenedy/aquarium-live',
    blurb: 'A living aquarium drawn in real time. Four scenes, six looks, day and night. No ads.',
  },
  {
    id: 'aquarium-4k',
    name: 'Aquarium 4K',
    pkg: 'com.jeremykenedy.firetv.aquarium',
    dreamComponent: 'com.jeremykenedy.firetv.aquarium/.AquariumDreamService',
    repo: 'jeremykenedy/fire-tv-aquarium',
    blurb: 'Offline 4K aquarium footage with custom fish, sea life and backgrounds. No ads.',
  },
  {
    id: 'cloud-drift-clock',
    name: 'Cloud Drift Clock',
    pkg: 'com.jeremykenedy.clouddriftclock',
    dreamComponent: 'com.jeremykenedy.clouddriftclock/.CloudDreamService',
    repo: 'jeremykenedy/cloud-drift-clock',
    blurb: 'Real filmed flight through sunset clouds, with an optional drifting clock and playback speed. No ads, analytics or tracking.',
  },
  {
    id: 'prism-clock',
    name: 'Prism Clock',
    pkg: 'com.jeremykenedy.prismclock',
    dreamComponent: 'com.jeremykenedy.prismclock/.PrismDreamService',
    repo: 'jeremykenedy/prism-clock',
    asset: 'prism-clock.apk',
    blurb: 'A moving faceted surface with a drifting clock, adjustable materials, lighting, time format and motion.',
  },
  {
    id: 'jellyfish-drift',
    name: 'Jellyfish Drift',
    pkg: 'com.jeremykenedy.jellyfishdrift',
    dreamComponent: 'com.jeremykenedy.jellyfishdrift/.JellyfishDreamService',
    repo: 'jeremykenedy/jellyfish-drift',
    blurb: 'Animated jellyfish with adjustable water, density, motion, species, light rays and an optional clock. No ads, analytics or tracking.',
  },
  {
    id: 'jellyfish-drift-v2',
    name: 'Jellyfish Drift V2',
    pkg: 'com.jeremykenedy.jellyfishdriftv2',
    dreamComponent: 'com.jeremykenedy.jellyfishdriftv2/.JellyfishDreamService',
    repo: 'jeremykenedy/jellyfish-drift-v2',
    asset: 'jellyfish-drift-v2.apk',
    blurb: 'Real filmed jellyfish in blue aquarium and deep ocean scenes, with playback speed, random scene controls and an optional clock. No ads, analytics or tracking.',
  },
  {
    id: 'firefly-grove',
    name: 'Firefly Grove',
    pkg: 'com.jeremykenedy.fireflygrove',
    dreamComponent: 'com.jeremykenedy.fireflygrove/.FireflyDreamService',
    repo: 'jeremykenedy/firefly-grove',
    blurb: 'Animated fireflies in a quiet grove with adjustable density, motion and color. No ads, analytics or tracking.',
  },
  {
    id: 'neon-corridor',
    name: 'Neon Corridor',
    pkg: 'com.jeremykenedy.neoncorridor',
    dreamComponent: 'com.jeremykenedy.neoncorridor/.NeonDreamService',
    repo: 'jeremykenedy/neon-corridor',
    blurb: 'A procedural neon tunnel with adjustable density, speed, color, brightness and geometry. No ads, analytics or tracking.',
  },
  {
    id: 'starfield-drift',
    name: 'Starfield Drift',
    pkg: 'com.jeremykenedy.starfielddrift',
    dreamComponent: 'com.jeremykenedy.starfielddrift/.StarfieldDreamService',
    repo: 'jeremykenedy/starfield-drift',
    blurb: 'A procedural animated starfield with adjustable density, speed, color, luminance, meteors and an optional clock. No ads, analytics or tracking.',
  },
  {
    id: 'rain-on-glass',
    name: 'Rain on Glass',
    pkg: 'com.jeremykenedy.rainonglass',
    dreamComponent: 'com.jeremykenedy.rainonglass/.RainDreamService',
    repo: 'jeremykenedy/rain-on-glass',
    blurb: 'Animated rainfall on soft or crisp glass with adjustable lighting, density, speed and distant lights. No ads, analytics or tracking.',
  },
  {
    id: 'rainforest-cascade',
    name: 'Rainforest Cascade',
    pkg: 'com.jeremykenedy.rainforestcascade',
    dreamComponent: 'com.jeremykenedy.rainforestcascade/.WaterfallDreamService',
    repo: 'jeremykenedy/rainforest-cascade',
    blurb: 'An animated waterfall with adjustable surroundings, day or night, width, flow, mist and sunlight shimmer. No ads, analytics or tracking.',
  },
  {
    id: 'blue-meridian',
    name: 'Blue Meridian',
    pkg: 'com.jeremykenedy.bluemeridian',
    dreamComponent: 'com.jeremykenedy.bluemeridian/.BlueMeridianDreamService',
    repo: 'jeremykenedy/blue-meridian',
    blurb: 'Detailed satellite Earth with gentle camera drift, atmosphere, city lights, clouds and adjustable stars. No ads, analytics or tracking.',
  },
  {
    id: 'twilight-hearth',
    name: 'Twilight Hearth',
    pkg: 'com.jeremykenedy.twilighthearth',
    dreamComponent: 'com.jeremykenedy.twilighthearth/.HearthDreamService',
    repo: 'jeremykenedy/twilight-hearth',
    blurb: 'Recorded wood fire with brick, stone and slate surrounds, flame exposure, embers, playback speed and room lighting. No ads, analytics or tracking.',
  },
  {
    id: 'nebula-drift',
    name: 'Nebula Drift',
    pkg: 'com.jeremykenedy.nebuladrift',
    dreamComponent: 'com.jeremykenedy.nebuladrift/.NebulaDreamService',
    repo: 'jeremykenedy/nebula-drift',
    blurb: 'Animated nebula clouds with adjustable structure, color, density, stars, meteors and an optional clock.',
  },
  {
    id: 'vortex-spiral',
    name: 'Vortex Spiral',
    pkg: 'com.jeremykenedy.vortexspiral',
    dreamComponent: 'com.jeremykenedy.vortexspiral/.VortexDreamService',
    repo: 'jeremykenedy/vortex-spiral',
    blurb: 'Animated spiral ribbons with adjustable arms, winding, color, brightness and motion.',
  },
  {
    id: 'signal-rain',
    name: 'Signal Rain',
    pkg: 'com.jeremykenedy.signalrain',
    dreamComponent: 'com.jeremykenedy.signalrain/.SignalRainDreamService',
    repo: 'jeremykenedy/signal-rain',
    blurb: 'Luminous abstract digital rain with adjustable streams, colors and motion.',
  },
  {
    id: 'retro-flight',
    name: 'Retro Flight',
    pkg: 'com.jeremykenedy.retroflight',
    dreamComponent: 'com.jeremykenedy.retroflight/.RetroFlightDreamService',
    repo: 'jeremykenedy/retro-flight',
    blurb: 'Continuous perspective flight through an original procedural star field.',
  },
  {
    id: 'pipeworks-dream',
    name: 'Pipeworks Dream',
    pkg: 'com.jeremykenedy.pipeworksdream',
    dreamComponent: 'com.jeremykenedy.pipeworksdream/.PipeworksDreamService',
    repo: 'jeremykenedy/pipeworks-dream',
    blurb: 'Growing 3D pipes with rounded bends, configurable colors, tube shapes, thickness and delayed following tails.',
  },
  {
    id: 'slot-vision',
    name: 'Slot Vision',
    pkg: 'com.jeremykenedy.reelatrium',
    dreamComponent: 'com.jeremykenedy.reelatrium/.ReelAtriumDreamService',
    repo: 'jeremykenedy/slot-vision',
    asset: 'slot-vision.apk',
    blurb: 'Classic and multi-row reels with cabinet or fullscreen views, seasonal themes, slow camera drift and payout coin showers.',
  },
  {
    id: 'hearth-presence',
    name: 'Hearth Presence',
    pkg: 'com.jeremykenedy.hearthpresence',
    dreamComponent: 'com.jeremykenedy.hearthpresence/.HearthDreamService',
    repo: 'jeremykenedy/hearth-presence',
    asset: 'hearth-presence.apk',
    blurb: 'Moving wood and gas fireplaces with adjustable surrounds, frame width, flame speed, light and sound controls.',
  },
  {
    id: 'aqua-surface',
    name: 'Aqua Surface Drift',
    pkg: 'com.jeremykenedy.aquasurfacedrift',
    dreamComponent: 'com.jeremykenedy.aquasurfacedrift/.AquaSurfaceDreamService',
    repo: 'jeremykenedy/aqua-surface-drift',
    blurb: 'Animated water with adjustable environment, lighting, ripples, motion, view and an optional clock.',
  },
  {
    id: 'earthbound-orbit',
    name: 'Earthbound Orbit',
    pkg: 'com.jeremykenedy.earthboundorbit',
    dreamComponent: 'com.jeremykenedy.earthboundorbit/.EarthboundOrbitDreamService',
    repo: 'jeremykenedy/earthbound-orbit',
    blurb: 'A continuously rotating Earth with adjustable atmosphere, star density and camera movement.',
  },
  {
    id: 'perseid-passage',
    name: 'Perseid Passage',
    pkg: 'com.jeremykenedy.perseidpassage',
    dreamComponent: 'com.jeremykenedy.perseidpassage/.MeteorDreamService',
    repo: 'jeremykenedy/perseid-passage',
    blurb: 'Animated meteor showers with adjustable frequency, size, speed, star density, palette and brightness. No network access.',
  },
  {
    id: 'split-flap-drift',
    name: 'Split-Flap Drift',
    pkg: 'com.jeremykenedy.splitflapdrift',
    dreamComponent: 'com.jeremykenedy.splitflapdrift/.SplitFlapDreamService',
    repo: 'jeremykenedy/split-flap-drift',
    blurb: 'An animated drifting flip clock with adjustable time format, seconds, date, finish, lighting, motion and a complete clock visibility switch.',
  },
  {
    id: 'canopy-drift',
    name: 'Canopy Drift',
    pkg: 'com.jeremykenedy.canopydrift',
    dreamComponent: 'com.jeremykenedy.canopydrift/.CanopyDreamService',
    repo: 'jeremykenedy/canopy-drift',
    blurb: 'An animated autumn canopy with falling leaves, adjustable tree style, leaf density, wind, lighting and an optional clock.',
  },
  {
    id: 'contour-flow',
    name: 'Contour Flow',
    pkg: 'com.jeremykenedy.contourflow',
    dreamComponent: 'com.jeremykenedy.contourflow/.ContourFlowDreamService',
    repo: 'jeremykenedy/contour-flow',
    blurb: 'Animated topographic contour fields with adjustable relief, palette, density, drift speed, line weight, lighting and brightness.',
  },
  {
    id: 'skyburst-nocturne',
    name: 'Skyburst Nocturne',
    pkg: 'com.jeremykenedy.skyburstnocturne',
    dreamComponent: 'com.jeremykenedy.skyburstnocturne/.FireworksDreamService',
    repo: 'jeremykenedy/skyburst-nocturne',
    blurb: 'Animated fireworks with adjustable frequency, size, speed, star density, palette and scene brightness.',
  },
  {
    id: 'pulse-circuit',
    name: 'Pulse Circuit',
    pkg: 'com.jeremykenedy.pulsecircuit',
    dreamComponent: 'com.jeremykenedy.pulsecircuit/.PulseDreamService',
    repo: 'jeremykenedy/pulse-circuit',
    blurb: 'Animated geometric patterns with adjustable arena, shape density, geometry, motion, palette, pulse rhythm and light intensity.',
  },
  {
    id: 'helios-lightfield',
    name: 'Helios Lightfield',
    pkg: 'com.jeremykenedy.helioslightfield',
    dreamComponent: 'com.jeremykenedy.helioslightfield/.HeliosLightfieldDreamService',
    repo: 'jeremykenedy/helios-lightfield',
    blurb: 'Animated luminous filaments looping around a dark field, with adjustable solar or polar palette, strand density, motion speed and glow.',
  },
];

/**
 * Pure: whether two "package/class" components name the same screensaver.
 * Apps write either the short form ("pkg/.Cls") or the full one
 * ("pkg/pkg.Cls"), so both are expanded before comparing.
 * @param {string | null} a
 * @param {string | null} b
 * @returns {boolean}
 */
export function sameComponent(a, b) {
  const full = (c) => (c || '').replace(/^([^/]+)\/\./, '$1/$1.');
  return full(a) === full(b);
}

/** Aerial Views is what the installer suggests and what --yes picks. */
export const DEFAULT_SCREENSAVER_ID = 'aerial';

// Screensavers that ship with the TV. Nothing to install or vet; they can
// only be made active.
export const BUILT_IN_SCREENSAVERS = [
  {
    id: 'colors',
    name: 'Colors',
    pkg: 'com.android.dreams.basic',
    dreamComponent: 'com.android.dreams.basic/.Colors',
    blurb: "Android's built-in slow color wash. Comes with the TV.",
  },
];

export const AMAZON_DEFAULT = {
  id: 'amazon',
  name: 'Amazon with Ads',
  pkg: 'com.amazon.ftv.screensaver',
  dreamComponent: 'com.amazon.ftv.screensaver/.app.services.ScreensaverService',
};
