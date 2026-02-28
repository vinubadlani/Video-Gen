import { Composition } from 'remotion';
import { ExplainerVideo } from './compositions/ExplainerVideo';

export const Root = () => {
  return (
    <>
      <Composition
        id="ExplainerVideo"
        component={ExplainerVideo}
        durationInFrames={600}   // placeholder – overridden at render time
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          scenes           : [],
          audioDurationSecs: 20,
          durationFrames   : 600,
          debug            : false,
        }}
      />
    </>
  );
};
