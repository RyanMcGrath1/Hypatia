import {Image} from 'expo-image';
import {Platform, StyleSheet, View, SafeAreaView} from 'react-native';
import React from 'react';
import CollapsibleHeader from '@/components/CollapsibleHeader';

import {HelloWave} from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import {ThemedText} from '@/components/ThemedText';
import {ThemedView} from '@/components/ThemedView';
import BasicItem from '@/components/BasicItem';
import ComponentCarousel from "@/components/ComponentCarousel";
import NewsCard from "@/components/NewsCard";





export default function RyanScreen() {
    return (
        <View style={{flex: 1}}>
            <ParallaxScrollView
                headerBackgroundColor={{light: '#A1CEDC', dark: '#1D3D47'}}
                headerImage={
                    <Image
                        source={require('@/assets/images/partial-react-logo.png')}
                        style={styles.reactLogo}
                    />
                }>
                <ThemedView style={styles.titleContainer}>
                    <ThemedText type="title">Welcome!</ThemedText>
                    <HelloWave/>
                </ThemedView>
                <ThemedView style={styles.stepContainer}>
                    <SafeAreaView style={{flex: 1}}>
                        <ComponentCarousel peek>
                            <NewsCard label="First component" bg="#BFDBFE" text={'hello'}/>
                            <NewsCard label="Second component" bg="#BBF7D0"/>
                            <NewsCard label="Third component" bg="#FECACA"/>
                            <NewsCard label="First component" bg="#BFDBFE" text={'hello'}/>
                            <NewsCard label="Second component" bg="#BBF7D0"/>
                            <NewsCard label="Third component" bg="#FECACA"/>
                            <NewsCard label="First component" bg="#BFDBFE" text={'hello'}/>
                            <NewsCard label="Second component" bg="#BBF7D0"/>
                            <NewsCard label="Third component" bg="#FECACA"/>
                        </ComponentCarousel>
                    </SafeAreaView>
                    <ThemedText type="subtitle">Step 1: Try it</ThemedText>
                    <ThemedText>
                        Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
                        Press{' '}
                        <ThemedText type="defaultSemiBold">
                            {Platform.select({
                                ios: 'cmd + d',
                                android: 'cmd + m',
                                web: 'F12',
                            })}
                        </ThemedText>{' '}
                        to open developer tools.
                    </ThemedText>
                </ThemedView>
                <ThemedView style={styles.stepContainer}>
                    <ThemedText type="subtitle">Step 2: Explore</ThemedText>
                    <ThemedText>
                        {`Tap the Explore tab to learn more about what's included in this starter app.`}
                    </ThemedText>
                </ThemedView>
                <ThemedView style={styles.stepContainer}>
                    <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
                    <ThemedText>
                        {`When you're ready, run `}
                        <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
                        <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
                        <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
                        <ThemedText type="defaultSemiBold">app-example</ThemedText>.
                    </ThemedText>
                </ThemedView>
                <ThemedView style={styles.stepContainer}>
                    <ThemedText type="subtitle">Step 4: Learn More</ThemedText>
                    <ThemedText>
                        Visit the{' '}
                        <ThemedText type="defaultSemiBold">documentation</ThemedText> to learn more about building apps
                        with this starter template.
                    </ThemedText>
                </ThemedView>
            </ParallaxScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        flexDirection: 'row', // Arrange child elements in a horizontal row
        alignItems: 'center', // Vertically center-align child elements
        gap: 8, // Add 8 units of spacing between child elements
        borderWidth: 2, // Set the thickness of the border to 2 units
        borderColor: '#A1CEDC', // Set the border color to a light blue shade
    },
    stepContainer: {
        gap: 8,
        marginBottom: 8,
    },
    reactLogo: {
        height: 178,
        width: 290,
        bottom: 0,
        left: 0,
        position: 'absolute',
    },

});

