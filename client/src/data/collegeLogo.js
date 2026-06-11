// Centralized college logo resolver.
// Returns a logo URL/path based on the college name coming from queue objects.

import CCS from '../assets/CCS.png';
import CBAA from '../assets/CBAA.png';
import COE from '../assets/COE.png';
import COED from '../assets/COED.png';
import CAS from '../assets/CAS.png';
import CHAS from '../assets/CHAS.png';

const COLLEGE_LOGOS = {
  'College of Computing Studies (CCS)': CCS,
  'College of Business, Accountancy and Administration (CBAA)': CBAA,
  'College of Education (COED)': COED,
  'College of Engineering (COE)': COE,
  'College of Arts and Sciences (CAS)': CAS,
  'College of Health and Allied Sciences (CHAS)': CHAS,

  // Also support the shorter names used elsewhere in the UI.
  'College of Computing Studies': CCS,
  'College of Business, Accountancy and Administration': CBAA,
  'College of Education': COED,
  'College of Engineering': COE,
  'College of Arts and Sciences': CAS,
  'College of Health and Allied Sciences': CHAS,
};

export function getCollegeLogo(collegeName) {
  if (!collegeName) return CCS;
  return COLLEGE_LOGOS[collegeName] || CCS;
}