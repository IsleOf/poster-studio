// Font registry — Vite resolves these ?url imports to hashed production paths at build time.
// This is the only reliable way to embed custom fonts in the SVG→Canvas render path,
// because blob-URL SVGs cannot resolve relative @font-face src URLs at runtime.
//
// Each entry: { weight, style, url } — url is a Vite-processed absolute path.

import AlexBrush400 from '../assets/fonts/Alex-Brush-400-normal.woff2?url';
import Allura400 from '../assets/fonts/Allura-400-normal.woff2?url';
import BebasNeue400 from '../assets/fonts/Bebas-Neue-400-normal.woff2?url';
import Calligraphy002400 from '../assets/fonts/Calligraphy002-400-normal.woff2?url';
import Cinzel400 from '../assets/fonts/Cinzel-400-normal.woff2?url';
import Cinzel700 from '../assets/fonts/Cinzel-700-normal.woff2?url';
import CormorantGaramond400 from '../assets/fonts/Cormorant-Garamond-400-normal.woff2?url';
import CormorantGaramond700 from '../assets/fonts/Cormorant-Garamond-700-normal.woff2?url';
import DancingScript400 from '../assets/fonts/Dancing-Script-400-normal.woff2?url';
import DancingScript700 from '../assets/fonts/Dancing-Script-700-normal.woff2?url';
import Details001500 from '../assets/fonts/Details001-500-normal.woff2?url';
import DidactGothic400 from '../assets/fonts/Didact-Gothic-400-normal.woff2?url';
import GreatVibes400 from '../assets/fonts/Great-Vibes-400-normal.woff2?url';
import Mapped2_300 from '../assets/fonts/Mapped2-300-normal.woff2?url';
import Mapped2_400 from '../assets/fonts/Mapped2-400-normal.woff2?url';
import Mapped2_500 from '../assets/fonts/Mapped2-500-normal.woff2?url';
import Mapped2_600 from '../assets/fonts/Mapped2-600-normal.woff2?url';
import Mapped2_700 from '../assets/fonts/Mapped2-700-normal.woff2?url';
import Mapped2_800 from '../assets/fonts/Mapped2-800-normal.woff2?url';
import Mapped2_900 from '../assets/fonts/Mapped2-900-normal.woff2?url';
import MappedMomentScript400 from '../assets/fonts/MappedMomentScript-400-normal.woff2?url';
import Montserrat400 from '../assets/fonts/Montserrat-400-normal.woff2?url';
import Nunito400 from '../assets/fonts/Nunito-400-normal.woff2?url';
import Nunito700 from '../assets/fonts/Nunito-700-normal.woff2?url';
import Orbitron400 from '../assets/fonts/Orbitron-400-normal.woff2?url';
import Orbitron700 from '../assets/fonts/Orbitron-700-normal.woff2?url';
import Oswald400 from '../assets/fonts/Oswald-400-normal.woff2?url';
import Oswald700 from '../assets/fonts/Oswald-700-normal.woff2?url';
import Parisienne400 from '../assets/fonts/Parisienne-400-normal.woff2?url';
import PetitFormalScript400 from '../assets/fonts/Petit-Formal-Script-400-normal.woff2?url';
import PinyonScript400 from '../assets/fonts/Pinyon-Script-400-normal.woff2?url';
import PlayfairDisplay400 from '../assets/fonts/Playfair-Display-400-normal.woff2?url';
import PlayfairDisplay700 from '../assets/fonts/Playfair-Display-700-normal.woff2?url';
import Poppins400 from '../assets/fonts/Poppins-400-normal.woff2?url';
import Poppins700 from '../assets/fonts/Poppins-700-normal.woff2?url';
import Sacramento400 from '../assets/fonts/Sacramento-400-normal.woff2?url';
import SpaceMono400 from '../assets/fonts/Space-Mono-400-normal.woff2?url';
import SpaceMono700 from '../assets/fonts/Space-Mono-700-normal.woff2?url';
import Tinos400 from '../assets/fonts/Tinos-400-normal.woff2?url';
import Tinos700 from '../assets/fonts/Tinos-700-normal.woff2?url';
import BrandonGrotesque500 from '../assets/fonts/Brandon-Grotesque-500-normal.woff2?url';
import Title001500 from '../assets/fonts/Title001-500-normal.woff2?url';
import Title002400 from '../assets/fonts/Title002-400-normal.woff2?url';
import Title003500 from '../assets/fonts/Title003-500-normal.woff2?url';
import Title004400 from '../assets/fonts/Title004-400-normal.woff2?url';
import Typewriter400 from '../assets/fonts/Typewriter-400-normal.woff2?url';
import Details002_300 from '../assets/fonts/Details002-300-normal.woff2?url';
import Details002_400 from '../assets/fonts/Details002-400-normal.woff2?url';
import Details002_700 from '../assets/fonts/Details002-700-normal.woff2?url';

interface FontVariant { weight: string; url: string; }

// Map font-family name → list of weight variants
export const FONT_REGISTRY: Record<string, FontVariant[]> = {
    'Alex Brush':           [{ weight: '400', url: AlexBrush400 }],
    'Allura':               [{ weight: '400', url: Allura400 }],
    'Bebas Neue':           [{ weight: '400', url: BebasNeue400 }],
    'Calligraphy002':       [{ weight: '400', url: Calligraphy002400 }],
    'Cinzel':               [{ weight: '400', url: Cinzel400 }, { weight: '700', url: Cinzel700 }],
    'Cormorant Garamond':   [{ weight: '400', url: CormorantGaramond400 }, { weight: '700', url: CormorantGaramond700 }],
    'Dancing Script':       [{ weight: '400', url: DancingScript400 }, { weight: '700', url: DancingScript700 }],
    'Details001':           [{ weight: '400', url: Details001500 }, { weight: '500', url: Details001500 }, { weight: '700', url: Details001500 }],
    'Didact Gothic':        [{ weight: '400', url: DidactGothic400 }],
    'Great Vibes':          [{ weight: '400', url: GreatVibes400 }],
    'Mapped Moment Script': [{ weight: '400', url: MappedMomentScript400 }],
    'Mapped2':              [
        { weight: '300', url: Mapped2_300 }, { weight: '400', url: Mapped2_400 },
        { weight: '500', url: Mapped2_500 }, { weight: '600', url: Mapped2_600 },
        { weight: '700', url: Mapped2_700 }, { weight: '800', url: Mapped2_800 },
        { weight: '900', url: Mapped2_900 },
    ],
    'Montserrat':           [{ weight: '400', url: Montserrat400 }],
    'Nunito':               [{ weight: '400', url: Nunito400 }, { weight: '700', url: Nunito700 }],
    'Orbitron':             [{ weight: '400', url: Orbitron400 }, { weight: '700', url: Orbitron700 }],
    'Oswald':               [{ weight: '400', url: Oswald400 }, { weight: '700', url: Oswald700 }],
    'Parisienne':           [{ weight: '400', url: Parisienne400 }],
    'Petit Formal Script':  [{ weight: '400', url: PetitFormalScript400 }],
    'Pinyon Script':        [{ weight: '400', url: PinyonScript400 }],
    'Playfair Display':     [{ weight: '400', url: PlayfairDisplay400 }, { weight: '700', url: PlayfairDisplay700 }],
    'Poppins':              [{ weight: '400', url: Poppins400 }, { weight: '700', url: Poppins700 }],
    'Sacramento':           [{ weight: '400', url: Sacramento400 }],
    'Space Mono':           [{ weight: '400', url: SpaceMono400 }, { weight: '700', url: SpaceMono700 }],
    'Tinos':                [{ weight: '400', url: Tinos400 }, { weight: '700', url: Tinos700 }],
    'Title001':             [{ weight: '400', url: Title001500 }, { weight: '500', url: Title001500 }, { weight: '700', url: Title001500 }],
    'Title002':             [{ weight: '400', url: Title002400 }],
    'Title003':             [{ weight: '400', url: Title003500 }, { weight: '500', url: Title003500 }, { weight: '700', url: Title003500 }],
    'Details002':           [{ weight: '300', url: Details002_300 }, { weight: '400', url: Details002_400 }, { weight: '700', url: Details002_700 }],
    'Brandon Grotesque':    [{ weight: '400', url: BrandonGrotesque500 }, { weight: '500', url: BrandonGrotesque500 }, { weight: '700', url: BrandonGrotesque500 }],
    'Title004':             [{ weight: '400', url: Title004400 }],
    'Typewriter':           [{ weight: '400', url: Typewriter400 }],
};
