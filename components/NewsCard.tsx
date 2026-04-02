import {StyleSheet, useWindowDimensions, View} from "react-native";
import {ThemedText} from "@/components/ThemedText";
import React from "react";
import {Image} from "expo-image";

export default function NewsCard({label, bg, text}: { label: string; bg: string; text?: string }) {
    const { width } = useWindowDimensions();
    const cardWidth = Math.min(280, Math.max(180, width * 0.7));

    return (
        <View style={[styles.card, {backgroundColor: bg, width: cardWidth}]}>
            <Image
                source={require('@/assets/images/react-logo.png')}
                style={{ width: 50, height: 50 }}
            />
            {<ThemedText style={{fontSize: 24, fontWeight: '700'}}>{label}</ThemedText>}
            {<ThemedText style={styles.cardText}>{text}</ThemedText>}

        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        minHeight: 220, // Maintains a balanced card size on smaller devices
        marginVertical: 12, // Adds vertical spacing of 12 units between cards
        marginHorizontal: 2, // Adds horizontal spacing of 6 units between cards
        borderRadius: 16, // Rounds the corners of the card with a radius of 16 units
        alignItems: 'center', // Centers child elements horizontally within the card
        justifyContent: 'center', // Centers child elements vertically within the card
        borderWidth: 2, // Sets the thickness of the card's border to 2 units
        borderColor: '#2f855a', // Green accent border
    },
    cardText: {
        fontSize: 18,
        fontWeight: '600'
    },
});