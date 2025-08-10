import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Create themed styles for the MessageBubble component
export const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.md,
      width: '100%',
    },

    containerGrouped: {
      marginTop: theme.spacing.xs,
    },

    containerNotGrouped: {
      marginTop: theme.spacing.md,
    },

    containerOwn: {
      alignItems: 'flex-end',
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
      gap: theme.spacing.sm,
      width: '100%',
    },

    name: {
      fontWeight: theme.typography.weights.semibold,
      marginLeft: theme.spacing.sm,
      flexShrink: 1,
      color: theme.colors.text,
    },

    time: {
      marginLeft: 'auto',
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
    },

    bubble: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      position: 'relative',
      maxWidth: screenWidth * 0.8,
      alignSelf: 'flex-start',
    },

    bubbleOwn: {
      backgroundColor: theme.colors.primary,
      alignSelf: 'flex-end',
    },

    text: {
      fontSize: theme.typography.sizes.md,
      lineHeight: 20,
      color: theme.colors.text,
    },

    textOwn: {
      color: theme.colors.background,
    },

    edited: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },

    image: {
      marginTop: theme.spacing.sm,
      height: 200,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surfaceSecondary,
    },

    imageLoadingOverlay: {
      position: 'absolute',
      top: theme.spacing.sm,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },

    imageLoadingText: {
      color: theme.colors.background,
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.medium,
    },

    existingReactions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },

    reactionBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    reactionBubbleActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },

    reactionEmoji: {
      fontSize: theme.typography.sizes.sm,
      marginRight: theme.spacing.xs,
    },

    reactionCount: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textSecondary,
    },

    reactionCountActive: {
      color: theme.colors.background,
    },

    addReactionButton: {
      position: 'absolute',
      top: theme.spacing.xs,
      right: theme.spacing.xs,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderRadius: theme.borderRadius.round,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    },

    addReactionButtonDisabled: {
      backgroundColor: 'rgba(200, 200, 200, 0.5)',
      borderColor: theme.colors.border,
    },

    addReactionText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    },

    addReactionTextDisabled: {
      color: theme.colors.textMuted,
    },

    reactionRowContainer: {
      marginTop: theme.spacing.sm,
      marginLeft: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.sm,
      ...theme.shadows.md,
    },

    replyToContainer: {
      flexDirection: 'row',
      marginTop: theme.spacing.sm,
      marginLeft: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },

    replyToLine: {
      width: 3,
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
      marginRight: theme.spacing.sm,
    },

    replyToContent: {
      flex: 1,
    },

    replyToLabel: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.primary,
      marginBottom: theme.spacing.xs,
    },

    replyToText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },

    statusContainer: {
      marginTop: theme.spacing.xs,
      alignItems: 'flex-end',
    },

    statusText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
    },

    statusFailed: {
      color: theme.colors.error,
    },

    statusSending: {
      color: theme.colors.textSecondary,
    },
  });

export default createStyles;

