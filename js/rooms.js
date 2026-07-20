/* Ashland Elementary 26/27 - room registry */
var G = window.G = window.G || {};

(function () {
  var R = {};

  function add(id, name, interior, floor) {
    R[id] = { id: id, name: name, interior: interior, floor: floor };
  }

  // Middle floor
  add('m-todd', "MRS. TODD'S OFFICE", 'office', 'middle');
  add('m-walker', "MRS. WALKER'S OFFICE", 'principal', 'middle');
  add('m-nurse', "NURSE'S OFFICE", 'office', 'middle');
  add('m-front', 'THE OFFICE', 'office', 'middle');
  add('m-eagles', "EAGLE'S NEST", 'office', 'middle');
  add('m-caf', 'CAFETERIA', 'cafeteria', 'middle');

  // Basement / downstairs
  add('b-gym', 'BASKETBALL GYM', 'gym', 'basement');
  R['b-gym'].noInterior = true; // the gym IS part of the basement map
  add('b-music', 'MUSIC ROOM', 'music', 'basement');
  add('b-dance', 'DANCE & DRAMA', 'dance', 'basement');

  // Top floor
  add('t-lib', 'LIBRARY / MEDIA ARTS', 'library', 'top');
  var NUMS = [200, 201, 205, 212, 213, 214, 215, 216, 217, 218, 219, 220,
              221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235];
  NUMS.forEach(function (n) {
    add('t-' + n, 'ROOM ' + n, 'classroom', 'top');
  });
  R['t-221'].name = 'ROOM 221 - ART';
  R['t-201'].name = 'ROOM 201 - PLC ROOM';

  G.ROOMS = R;
  G.CLASSROOM_NUMS = NUMS;
})();
