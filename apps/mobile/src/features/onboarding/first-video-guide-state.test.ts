import { advanceGuide, type GuideStep } from './first-video-guide-state';
describe('ilk video rehberi', () => {
  it('yalnız doğru gerçek eylemlerle ilerler; kaydet tıklaması tek başına başarı değildir', () => {
    let step: GuideStep = 'waiting';
    for (const action of ['begin', 'word', 'saved', 'closeWord', 'sentence', 'closeSentence', 'memory', 'account'] as const) step = advanceGuide(step, action);
    expect(step).toBe('done');
    expect(advanceGuide('save', 'sentence')).toBe('save');
    expect(advanceGuide('save', 'closeWord')).toBe('word');
    expect(advanceGuide('word', 'account')).toBe('word');
  });
  it('atlanan veya biten rehber yeniden başlamaz', () => {
    expect(advanceGuide('sentence', 'skip')).toBe('done');
    expect(advanceGuide('done', 'begin')).toBe('done');
  });
});
