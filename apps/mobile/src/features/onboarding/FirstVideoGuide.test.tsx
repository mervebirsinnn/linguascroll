import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GuideTip, useFirstVideoGuide } from './FirstVideoGuide';
import { FirstVideoGuideProvider } from './FirstVideoGuideProvider';
import { FIRST_VIDEO_GUIDE_KEY, type GuideAction } from './first-video-guide-state';
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
function Controls() {
  const guide = useFirstVideoGuide();
  return <><Text testID="step">{guide.step}</Text><Pressable onPress={() => guide.begin('first')}><Text>Begin</Text></Pressable>
    {(['word', 'saved', 'closeWord', 'sentence', 'closeSentence', 'memory', 'account'] as GuideAction[]).map(action => <Pressable key={action} testID={`action-${action}`} onPress={() => guide.act(action)}><Text>{action}</Text></Pressable>)}
    <GuideTip steps={['word', 'save', 'closeWord', 'sentence', 'closeSentence', 'memory', 'account']} /></>;
}
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });
it('dokunma ile ilerler, atlanınca kaydeder ve yeniden açılışta gizler', async () => {
  const first = await render(<FirstVideoGuideProvider><Controls /></FirstVideoGuideProvider>);
  await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('waiting'));
  await fireEvent.press(screen.getByText('Begin'));
  expect(screen.getByTestId('guide-word')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('action-word'));
  expect(screen.getByTestId('guide-save')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('action-sentence'));
  expect(screen.getByTestId('guide-save')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('İlk kullanım rehberini atla'));
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(FIRST_VIDEO_GUIDE_KEY, 'done'));
  await first.unmount();
  await render(<FirstVideoGuideProvider><Controls /></FirstVideoGuideProvider>);
  await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalledWith(FIRST_VIDEO_GUIDE_KEY));
  await fireEvent.press(screen.getByText('Begin'));
  expect(screen.queryByTestId('guide-word')).toBeNull();
});
it('hesap adımından sonra tamamlanır ve saklanır', async () => {
  await render(<FirstVideoGuideProvider><Controls /></FirstVideoGuideProvider>);
  await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('waiting'));
  await fireEvent.press(screen.getByText('Begin'));
  for (const action of ['word', 'saved', 'closeWord', 'sentence', 'closeSentence', 'memory', 'account']) await fireEvent.press(screen.getByTestId(`action-${action}`));
  expect(screen.getByTestId('step')).toHaveTextContent('done');
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(FIRST_VIDEO_GUIDE_KEY, 'done'));
});
