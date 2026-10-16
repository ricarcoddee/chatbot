 /* ╔══════════════════════════════════════════════╗
 * ║                  CHATBOT                     ║
 * ╠══════════════════════════════════════════════╣
 * ║ Proyecto:chatbot                             ║
 * ║ Autor: Ricardo Hernandez Diaz                ║
 * ║ Carné: 2024445                               ║
 * ║ Rol: Practicante                             ║
 * ╚══════════════════════════════════════════════╝
 */
const DEFAULT_OPTIONS = {
  startHour: 7,
  endHour: 15,
  workDays: [1, 2, 3, 4, 5], 
};

function isBusinessDay(date, workDays) {
  return workDays.includes(date.getDay());
}

function hourOfDay(date) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function snapToBusinessWindow(date, opts) {
  const d = new Date(date);
  for (;;) {
    if (!isBusinessDay(d, opts.workDays)) {
      d.setDate(d.getDate() + 1);
      d.setHours(opts.startHour, 0, 0, 0);
      continue;
    }
    const hour = hourOfDay(d);
    if (hour < opts.startHour) {
      d.setHours(opts.startHour, 0, 0, 0);
      return d;
    }
    if (hour >= opts.endHour) {
      d.setDate(d.getDate() + 1);
      d.setHours(opts.startHour, 0, 0, 0);
      continue;
    }
    return d;
  }
}

function addBusinessHours(startDate, hoursToAdd, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let current = snapToBusinessWindow(startDate, opts);
  let remaining = hoursToAdd;

  while (remaining > 0) {
    const hoursLeftToday = opts.endHour - hourOfDay(current);
    if (remaining <= hoursLeftToday) {
      current = new Date(current.getTime() + remaining * 3600 * 1000);
      remaining = 0;
    } else {
      remaining -= hoursLeftToday;
      current.setDate(current.getDate() + 1);
      current.setHours(opts.startHour, 0, 0, 0);
      current = snapToBusinessWindow(current, opts);
    }
  }
  return current;
}

module.exports = { addBusinessHours };
