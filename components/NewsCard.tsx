import {StyleSheet, View} from "react-native";
import {ThemedText} from "@/components/ThemedText";
import React from "react";
import {Image} from "expo-image";

export default function NewsCard({label, bg, text}: { label: string; bg: string; text?: string }) {
    return (
        <View style={[styles.card, {backgroundColor: bg}]}>&#39;
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
        height: 260, // Sets the height of the card to 160 units
        width: 160,
        marginVertical: 12, // Adds vertical spacing of 12 units between cards
        marginHorizontal: 2, // Adds horizontal spacing of 6 units between cards
        borderRadius: 16, // Rounds the corners of the card with a radius of 16 units
        alignItems: 'center', // Centers child elements horizontally within the card
        justifyContent: 'center', // Centers child elements vertically within the card
        borderWidth: 2, // Sets the thickness of the card's border to 2 units
        borderColor: '#007AFF', // Sets the color of the card's border to a blue shade
    },
    cardText: {
        fontSize: 18,
        fontWeight: '600'
    },
});