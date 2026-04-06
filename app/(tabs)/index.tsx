import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Home tab: parallax header and welcome content.
export default function HomeScreen() {
    return (
        <View style={{flex: 1}}>
            <ParallaxScrollView
                headerBackgroundColor={{light: '#d1d5db', dark: '#1f2937'}}
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
                        <ThemedText type="defaultSemiBold">documentation</ThemedText> to learn more about building apps with this starter template.
                    </ThemedText>
                </ThemedView>
            </ParallaxScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
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

