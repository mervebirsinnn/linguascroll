export const FIRST_VIDEO_GUIDE_KEY = 'looplish.firstVideoGuide.v1';
export type GuideStep = 'waiting' | 'word' | 'save' | 'closeWord' | 'sentence' | 'closeSentence' | 'memory' | 'account' | 'done';
export type GuideAction = 'begin' | 'word' | 'saved' | 'closeWord' | 'sentence' | 'closeSentence' | 'memory' | 'account' | 'skip';
const transitions: Partial<Record<GuideStep, Partial<Record<GuideAction, GuideStep>>>> = {
  waiting: { begin: 'word' }, word: { word: 'save' }, save: { saved: 'closeWord', closeWord: 'word' },
  closeWord: { closeWord: 'sentence' }, sentence: { sentence: 'closeSentence' },
  closeSentence: { closeSentence: 'memory' }, memory: { memory: 'account' }, account: { account: 'done' },
};
export function advanceGuide(step: GuideStep, action: GuideAction): GuideStep {
  return action === 'skip' ? 'done' : transitions[step]?.[action] ?? step;
}
