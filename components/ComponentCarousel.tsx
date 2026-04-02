import React from 'react';
import {
    View,
    FlatList,
    Dimensions,
    StyleSheet,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from 'react-native';

const { width } = Dimensions.get('window');

interface ComponentCarouselProps {
    children: React.ReactNode;        // any React Native components passed as children
    borderRadius?: number;            // optional rounded corners for each slide
    peek?: boolean;                   // show a bit of next/prev slide
}

export default function ComponentCarousel({
                                              children,
                                              borderRadius = 16,
                                              peek = false,
                                          }: ComponentCarouselProps) {
    // Convert children (React components passed into the carousel) into an array
    const slides = React.Children.toArray(children);

    // State to track the currently active slide index
    const [index, setIndex] = React.useState(0);

    // TODO These two lines change the size of the actual cards
    // slideWidth determines the width of each slide. If `peek` is true, the width is reduced to 45% of the screen width to allow peeking at adjacent slides.
    // Adjust the multiplier (e.g., 0.45) to control how much of the next/previous slide is visible.
    const slideWidth = peek ? width * 0.12 : width;

    // sideSpacer determines the padding on the sides of the carousel when `peek` is enabled.
    // Adjust the divisor (e.g., 100) to control the spacing between slides and the screen edges.
    const sideSpacer = peek ? (width - slideWidth) / 100 : 0;

    // Handles the scroll event to update the active slide index
    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = e.nativeEvent.contentOffset.x; // Get the horizontal scroll position
        const newIndex = Math.round(x / slideWidth); // Calculate the new index based on scroll position
        if (newIndex !== index) setIndex(newIndex); // Update the index if it has changed
    };

    return (
        <View>
            {/* FlatList renders the slides horizontally */}
            <FlatList
                data={slides} // Array of slides (converted from children)
                keyExtractor={(_, i) => String(i)} // Unique key for each slide
                renderItem={({ item }) => (
                    // Render each slide with the specified width and borderRadius
                    <View style={[styles.slide, { width: slideWidth, borderRadius }]}>
                        {item as React.ReactElement} {/* Render the child component */}
                    </View>
                )}
                horizontal // Enables horizontal scrolling
                pagingEnabled={!peek} // Enables snapping to slides unless peeking is enabled
                showsHorizontalScrollIndicator={false} // Hides the scroll indicator
                onScroll={onScroll} // Updates the active slide index on scroll
                scrollEventThrottle={16} // Limits the frequency of scroll events
                snapToInterval={slideWidth} // Ensures snapping to each slide
                decelerationRate="fast" // Makes scrolling stop quickly
                snapToAlignment="start" // Aligns the slides to the start of the viewport
                contentContainerStyle={{
                    paddingHorizontal: sideSpacer, // Adds side padding for peeking
                }}
            />

            {/* Dots indicator for the active slide */}
            <View style={styles.dots}>
                {slides.map((_, i) => (
                    <View
                        key={i}
                        style={[styles.dot, i === index && styles.dotActive]} // Highlight the active dot
                    />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    slide: {
        overflow: 'hidden',   // Ensures child components respect the borderRadius
    },
    dots: {
        flexDirection: 'row', // Align dots in a row
        justifyContent: 'center', // Center the dots
        gap: 2, // Add spacing between dots
        paddingTop: 10, // Add padding above the dots
    },
    dot: {
        width: 8, // Default dot size
        height: 8,
        borderRadius: 999, // Makes the dots circular
        backgroundColor: '#D1D5DB', // Default dot color
    },
    dotActive: {
        width: 10, // Slightly larger size for the active dot
        height: 10,
        backgroundColor: '#111827', // Active dot color
    },
});
