import { phasesInOrder, tasks } from '../../content';
import { getTasksForTrack, getTodayTasks } from '../engine';
import { resolveSelectedTask, sliceTodayTasks, todayTaskLimit } from '../layout';

const lecturer = getTasksForTrack(tasks, 'lecturer');
const dueDay9 = getTodayTasks(lecturer, {}, 9, Number.POSITIVE_INFINITY, phasesInOrder);

describe('desktop layout helpers', () => {
  it('today limit: 3 on compact/medium, 5 on wide', () => {
    expect(todayTaskLimit(false)).toBe(3);
    expect(todayTaskLimit(true)).toBe(5);
  });

  it('sliceTodayTasks keeps order and counts hidden tasks', () => {
    expect(dueDay9.length).toBeGreaterThan(5);
    const compact = sliceTodayTasks(dueDay9, false);
    const wide = sliceTodayTasks(dueDay9, true);
    expect(compact.visible).toEqual(dueDay9.slice(0, 3));
    expect(compact.hidden).toBe(dueDay9.length - 3);
    expect(wide.visible).toEqual(dueDay9.slice(0, 5));
    expect(wide.hidden).toBe(dueDay9.length - 5);
    expect(sliceTodayTasks([], true)).toEqual({ visible: [], hidden: 0 });
  });

  it('resolveSelectedTask drops a selection hidden by the filter', () => {
    expect(resolveSelectedTask(null, lecturer)).toBeNull();
    expect(resolveSelectedTask('t-lec-syllabus', lecturer)?.id).toBe('t-lec-syllabus');
    expect(resolveSelectedTask('t-lec-syllabus', lecturer.filter((t) => t.owner !== 'me'))).toBeNull();
  });
});
