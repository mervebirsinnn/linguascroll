import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GuideContext } from './FirstVideoGuide';
import { advanceGuide, FIRST_VIDEO_GUIDE_KEY, type GuideAction, type GuideStep } from './first-video-guide-state';

/** Installation-local: no account data, API writes or timers. Only real UI actions advance the guide. */
export function FirstVideoGuideProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<GuideStep>('done');
  const [videoId, setVideoId] = useState<string | null>(null);
  const chosenVideo = useRef<string | null>(null);
  useEffect(() => {
    let current = true;
    AsyncStorage.getItem(FIRST_VIDEO_GUIDE_KEY).then(value => {
      if (current) setStep(value === 'done' ? 'done' : 'waiting');
    }).catch(() => { /* Storage unavailable: keep the feed usable without repeated prompts. */ });
    return () => { current = false; };
  }, []);
  const act = useCallback((action: GuideAction) => {
    setStep(previous => advanceGuide(previous, action));
  }, []);
  const begin = useCallback((id: string) => {
    if (chosenVideo.current !== null) return;
    chosenVideo.current = id;
    setVideoId(id);
    act('begin');
  }, [act]);
  const started = useRef(false);
  useEffect(() => {
    if (step !== 'done' && step !== 'waiting') started.current = true;
    if (step === 'done' && started.current) {
      void AsyncStorage.setItem(FIRST_VIDEO_GUIDE_KEY, 'done').catch(() => {});
    }
  }, [step]);
  return <GuideContext.Provider value={{ step, videoId, begin, act }}>{children}</GuideContext.Provider>;
}

