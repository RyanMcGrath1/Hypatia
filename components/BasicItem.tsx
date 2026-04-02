import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

// Define the props interface for the component
interface MyComponentProps {
    title: string; // Title text to display
    color: string; // Text color for the title
}

export default function BasicItem({ title, color }: MyComponentProps) {
    // State to track the number of button presses
    const [count, setCount] = React.useState(0);

    // Function to handle button press and increment the count
    const handlePress = () => setCount((c) => c + 1);

    // Effect to log a message whenever the component mounts or the count changes
    React.useEffect(() => {
        console.log('Component mounted or count changed');
    }, [count]); // Dependency array ensures this runs on mount and when `count` changes

    return (
        <View style={styles.container}>
            {/* Display the title with the specified color */}
            <Text style={[styles.title, { color }]}>{title}</Text>
            
            {/* Display the current count */}
            <Text style={styles.text}>You tapped {count} times</Text>

            {/* Button to increment the count */}
            <Pressable
                onPress={handlePress} // Attach the press handler
                style={({ pressed }) => [
                    styles.button, // Default button style
                    pressed && styles.buttonPressed, // Style when button is pressed
                ]}
            >
                {/* Button text */}
                <Text style={styles.buttonText}>Tap Me</Text>
            </Pressable>
        </View>
    );
}

// Styles for the component
const styles = StyleSheet.create({
    container: {
        padding: 16, // Padding inside the container
        alignItems: 'center', // Center align items horizontally
        gap: 8, // Space between child elements
        borderWidth: 2, // Outline thickness
        borderColor: '#007AFF', // Outline color
        borderRadius: 12, // Rounded corners
    },
    title: {
        fontSize: 24, // Font size for the title
        fontWeight: '600', // Semi-bold font weight
    },
    text: {
        fontSize: 16, // Font size for the count text
        marginBottom: 8, // Space below the text
    },
    button: {
        paddingHorizontal: 16, // Horizontal padding for the button
        paddingVertical: 10, // Vertical padding for the button
        borderRadius: 12, // Rounded corners for the button
        backgroundColor: '#222', // Button background color
    },
    buttonPressed: {
        opacity: 0.85, // Slightly reduce opacity when pressed
        transform: [{ scale: 0.98 }], // Slightly shrink the button when pressed
    },
    buttonText: {
        color: '#fff', // Text color for the button
        fontWeight: '600', // Semi-bold font weight for the button text
    },
});
