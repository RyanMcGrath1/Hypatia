import type { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';

// Constant defining the height of the header
// TODO This variable sets the height of the header image. So if you wanted to make it smaller,
//  change this value and the image size in the parent component.
const HEADER_HEIGHT = 250;

// Define the props for the ParallaxScrollView component
type Props = PropsWithChildren<{
  headerImage: ReactElement; // React element to display in the header
  headerBackgroundColor: { dark: string; light: string }; // Background colors for dark and light themes
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  // Determine the current color scheme (light or dark)
  const colorScheme = useColorScheme() ?? 'light';

  // Create a reference for the animated scroll view
  const scrollRef = useAnimatedRef<Animated.ScrollView>();

  // Get the scroll offset of the scroll view
  const scrollOffset = useScrollViewOffset(scrollRef);

  // Get the bottom padding to account for the tab bar overflow
  const bottom = useBottomTabOverflow();

  // Define the animated style for the header based on the scroll offset
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          // Translate the header vertically based on the scroll offset
          translateY: interpolate(
            scrollOffset.value,
            [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
            [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
          ),
        },
        {
          // Scale the header based on the scroll offset
          scale: interpolate(scrollOffset.value, [-HEADER_HEIGHT, 0, HEADER_HEIGHT], [2, 1, 1]),
        },
      ],
    };
  });

  return (
    // Main container view with themed styling
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef} // Attach the animated scroll view reference
        scrollEventThrottle={16} // Throttle scroll events for performance
        scrollIndicatorInsets={{ bottom }} // Adjust scroll indicator for tab bar overflow
        contentContainerStyle={{ paddingBottom: bottom }} // Add padding to the bottom of the content
      >
        {/* Animated header view with background color and animation */}
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] }, // Set background color based on theme
            headerAnimatedStyle, // Apply animated styles
          ]}
        >
          {headerImage /* Render the header image */}
        </Animated.View>
        {/* Content area for children components */}
        <ThemedView style={styles.content}>{children}</ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

// Styles for the component
const styles = StyleSheet.create({
  container: {
    flex: 1, // Take up the full available space
  },
  header: {
    height: HEADER_HEIGHT, // Set the height of the header
    overflow: 'hidden', // Hide content that overflows the header
  },
  content: {
    flex: 1, // Take up the remaining space
    padding: 32, // Add padding around the content
    gap: 16, // Add spacing between child elements
    overflow: 'hidden', // Hide content that overflows the container
  },
});
