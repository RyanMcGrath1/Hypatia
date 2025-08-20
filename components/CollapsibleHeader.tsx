import React, { useState } from 'react';
import { Animated, StyleSheet, Text, View, ScrollView } from 'react-native';

export default function CollapsibleHeader({ title }: { title: string }) {
    const [scrollY] = useState(new Animated.Value(0));

    const headerHeight = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [60, 0],
        extrapolate: 'clamp',
    });

    const scrollHandler = Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false }
    );

    return (
        <>
            <Animated.View style={[styles.header, { height: headerHeight }]}>
                <Text style={styles.headerText}>{title}</Text>
            </Animated.View>
            <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
                {/* Content goes here */}
            </Animated.ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});