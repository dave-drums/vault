/* vault-courses.js
   Purpose: Course configuration data
   Used by: Course index pages, progress tracking, admin console
*/
(function(){
  'use strict';
  window.VAULT_COURSES = {
    'gs1': {
      name: 'Groove Studies 1',
      pathway: 'groove',
      lessons: ['1.01', '1.02', '1.03', '1.04', '1.05', '1.06', '1.07', '1.08', 
                '1.09', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16',
                '1.17', '1.18', '1.19', '1.20', '1.21', '1.22', '1.23']
    },
    'gs2': { name: 'Groove Studies 2', pathway: 'groove', lessons: [] },
    'gs3': { name: 'Groove Studies 3', pathway: 'groove', lessons: [] },
    'gs4': { name: 'Groove Studies 4', pathway: 'groove', lessons: [] },
    'fs1': { 
       name: 'Fill Studies 1', 
       pathway: 'fills', 
       lessons: ['1.01', '1.02', '1.03', '1.04', '1.05', '1.06', '1.07', '1.08', 
                '1.09', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16',
                '1.17', '1.18', '1.19', '1.20', '1.21', '1.22', '1.23']
    },
    'fs2': { name: 'Fill Studies 2', pathway: 'fills', lessons: [] },
    'fs3': { name: 'Fill Studies 3', pathway: 'fills', lessons: [] },
    'fs4': { name: 'Fill Studies 4', pathway: 'fills', lessons: [] },
    'ss1': { name: 'Stick Studies 1', pathway: 'sticks', lessons: [] },
    'ss2': { name: 'Stick Studies 2', pathway: 'sticks', lessons: [] },
    'ss3': { name: 'Stick Studies 3', pathway: 'sticks', lessons: [] },
    'ss4': { name: 'Stick Studies 4', pathway: 'sticks', lessons: [] },
    'ks1': { name: 'Kick Studies 1', pathway: 'kicks', lessons: [] },
    'ks2': { name: 'Kick Studies 2', pathway: 'kicks', lessons: [] },
    'ks3': { name: 'Kick Studies 3', pathway: 'kicks', lessons: [] }
  };
})();
