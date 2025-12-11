import { format, addDays, startOfWeek } from 'date-fns';

interface ScheduleEvent {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  className: string;
  room?: string | null;
}

interface AssignmentEvent {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  description?: string | null;
}

const formatICSDate = (date: Date): string => {
  return format(date, "yyyyMMdd'T'HHmmss");
};

const escapeICSText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

export const generateScheduleICS = (events: ScheduleEvent[], weeksAhead: number = 4): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Junior Scholars//Class Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Junior Scholars Schedule',
  ];

  const today = new Date();
  const startWeek = startOfWeek(today, { weekStartsOn: 0 });

  events.forEach(event => {
    // Generate events for the next N weeks
    for (let week = 0; week < weeksAhead; week++) {
      const eventDate = addDays(startWeek, event.dayOfWeek + (week * 7));
      
      // Skip past dates
      if (eventDate < today && week === 0) continue;

      const [startHour, startMin] = event.startTime.split(':').map(Number);
      const [endHour, endMin] = event.endTime.split(':').map(Number);

      const startDateTime = new Date(eventDate);
      startDateTime.setHours(startHour, startMin, 0, 0);

      const endDateTime = new Date(eventDate);
      endDateTime.setHours(endHour, endMin, 0, 0);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${event.id}-${week}@juniorscholars`);
      lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
      lines.push(`DTSTART:${formatICSDate(startDateTime)}`);
      lines.push(`DTEND:${formatICSDate(endDateTime)}`);
      lines.push(`SUMMARY:${escapeICSText(event.subjectName)} - ${escapeICSText(event.className)}`);
      if (event.room) {
        lines.push(`LOCATION:${escapeICSText(event.room)}`);
      }
      lines.push(`DESCRIPTION:Class: ${escapeICSText(event.className)}`);
      lines.push('END:VEVENT');
    }
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

export const generateAssignmentsICS = (assignments: AssignmentEvent[]): string => {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Junior Scholars//Assignments//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Junior Scholars Assignments',
  ];

  assignments.forEach(assignment => {
    if (!assignment.dueDate) return;

    const dueDateTime = new Date(assignment.dueDate);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${assignment.id}@juniorscholars`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`DTSTART:${formatICSDate(dueDateTime)}`);
    lines.push(`DTEND:${formatICSDate(dueDateTime)}`);
    lines.push(`SUMMARY:Due: ${escapeICSText(assignment.title)}`);
    lines.push(`DESCRIPTION:${escapeICSText(assignment.type)}${assignment.description ? '\\n' + escapeICSText(assignment.description) : ''}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
};

export const downloadICSFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
