import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FormButton } from '@/components/forms/FormButton';
import { FormNotice } from '@/components/forms/FormNotice';
import { FormTextField } from '@/components/forms/FormTextField';
import { ProfileFieldRow } from '@/components/profile/ProfileFieldRow';
import { SectionCard } from '@/components/surfaces/SectionCard';
import { ThemedText } from '@/components/theme/ThemedText';
import { Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { ProfileApiError } from '@/hooks/api/profileApi';
import type { UpdatePersonalInfoParams } from '@/hooks/useProfile';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeInteractive } from '@/hooks/useThemeInteractive';
import { formatProfileDate } from '@/lib/profile/formatProfileDate';
import { validateProfileName } from '@/lib/profile/validateProfileName';

export type ProfilePersonalInfoSectionProps = {
  firstName: string;
  lastName: string;
  dateJoined: string;
  /**
   * When false (dev bypass / no session), Edit is hidden and saving is disabled.
   */
  editable?: boolean;
  /**
   * PATCH first/last via useProfile. Required when editable.
   * Returns the server Profile (caller / hook owns store update).
   */
  updatePersonalInfo?: (
    params: UpdatePersonalInfoParams,
  ) => Promise<unknown>;
};

type FieldErrors = {
  firstName?: string;
  lastName?: string;
};

function mapSaveError(error: unknown): string {
  if (error instanceof ProfileApiError) {
    if (error.status === 401) {
      return 'Your changes could not be saved with the current session.';
    }
    if (error.status === 400) {
      const message = error.message.trim();
      if (
        message.length > 0 &&
        message.length < 200 &&
        !message.includes('{') &&
        !/token|password|stack|traceback/i.test(message)
      ) {
        return message;
      }
    }
  }
  return 'Unable to update your personal information. Please try again.';
}

/**
 * Personal Information section with optional First/Last name edit.
 *
 * Edit policy when underlying Profile changes mid-edit:
 * drafts snapshot values at Edit; if firstName/lastName diverge from that
 * snapshot while editing (e.g. session refresh reload), exit edit mode and
 * discard the draft. Own successful Save exits edit before relying on this.
 */
export function ProfilePersonalInfoSection({
  firstName,
  lastName,
  dateJoined,
  editable = false,
  updatePersonalInfo,
}: ProfilePersonalInfoSectionProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();

  const [isEditing, setIsEditing] = useState(false);
  const [draftFirstName, setDraftFirstName] = useState(firstName);
  const [draftLastName, setDraftLastName] = useState(lastName);
  const [baselineFirstName, setBaselineFirstName] = useState(firstName);
  const [baselineLastName, setBaselineLastName] = useState(lastName);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditing(false);
    setDraftFirstName(firstName);
    setDraftLastName(lastName);
    setFieldErrors({});
    setSaveError(null);
  }, [firstName, lastName]);

  // If Profile names change under us while editing (refresh / session), exit.
  useEffect(() => {
    if (!isEditing || isSaving) {
      return;
    }
    if (
      firstName !== baselineFirstName ||
      lastName !== baselineLastName
    ) {
      setIsEditing(false);
      setDraftFirstName(firstName);
      setDraftLastName(lastName);
      setFieldErrors({});
      setSaveError(null);
    }
  }, [
    isEditing,
    isSaving,
    firstName,
    lastName,
    baselineFirstName,
    baselineLastName,
  ]);

  const trimmedFirst = draftFirstName.trim();
  const trimmedLast = draftLastName.trim();
  const firstNameError = validateProfileName(draftFirstName, 'First name');
  const lastNameError = validateProfileName(draftLastName, 'Last name');
  const isValid = !firstNameError && !lastNameError;
  const hasChanges =
    trimmedFirst !== firstName || trimmedLast !== lastName;
  const canSave = isValid && hasChanges && !isSaving && !!updatePersonalInfo;

  const beginEdit = useCallback(() => {
    setDraftFirstName(firstName);
    setDraftLastName(lastName);
    setBaselineFirstName(firstName);
    setBaselineLastName(lastName);
    setFieldErrors({});
    setSaveError(null);
    setSuccessNotice(false);
    setIsEditing(true);
  }, [firstName, lastName]);

  const handleCancel = useCallback(() => {
    if (isSaving) {
      return;
    }
    exitEditMode();
  }, [exitEditMode, isSaving]);

  const handleSave = useCallback(async () => {
    if (!updatePersonalInfo || isSaving) {
      return;
    }

    const nextErrors: FieldErrors = {
      firstName: validateProfileName(draftFirstName, 'First name'),
      lastName: validateProfileName(draftLastName, 'Last name'),
    };
    setFieldErrors(nextErrors);
    if (nextErrors.firstName || nextErrors.lastName) {
      return;
    }

    const nextTrimmedFirst = draftFirstName.trim();
    const nextTrimmedLast = draftLastName.trim();
    const changes: UpdatePersonalInfoParams = {};
    if (nextTrimmedFirst !== firstName) {
      changes.firstName = nextTrimmedFirst;
    }
    if (nextTrimmedLast !== lastName) {
      changes.lastName = nextTrimmedLast;
    }
    if (changes.firstName === undefined && changes.lastName === undefined) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSuccessNotice(false);

    try {
      await updatePersonalInfo(changes);
      if (!mountedRef.current) {
        return;
      }
      setIsEditing(false);
      setFieldErrors({});
      setSaveError(null);
      setSuccessNotice(true);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }
      setSaveError(mapSaveError(error));
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }, [
    draftFirstName,
    draftLastName,
    firstName,
    lastName,
    isSaving,
    updatePersonalInfo,
  ]);

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <ThemedText
          type="subtitle"
          style={[styles.heading, { color: semantic.mutedText }]}
          accessibilityRole="header"
        >
          Personal Information
        </ThemedText>
        {editable && !isEditing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit personal information"
            onPress={beginEdit}
            hitSlop={8}
            testID="profile-personal-info-edit"
          >
            <ThemedText
              style={[styles.editAction, { color: interactive.primary }]}
            >
              Edit
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {successNotice && !isEditing ? (
        <FormNotice
          tone="success"
          title="Updated"
          message="Personal information updated."
        />
      ) : null}

      {saveError && isEditing ? (
        <FormNotice tone="error" title="Unable to save" message={saveError} />
      ) : null}

      <SectionCard
        backgroundColor={semantic.cardBackground}
        borderColor={semantic.cardBorder}
      >
        {isEditing ? (
          <View style={styles.editFields}>
            <FormTextField
              label="First Name"
              value={draftFirstName}
              onChangeText={(text) => {
                setDraftFirstName(text);
                setFieldErrors((prev) => ({
                  ...prev,
                  firstName: validateProfileName(text, 'First name'),
                }));
              }}
              error={fieldErrors.firstName}
              disabled={isSaving}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="givenName"
              returnKeyType="next"
              testID="profile-first-name-input"
            />
            <FormTextField
              label="Last Name"
              value={draftLastName}
              onChangeText={(text) => {
                setDraftLastName(text);
                setFieldErrors((prev) => ({
                  ...prev,
                  lastName: validateProfileName(text, 'Last name'),
                }));
              }}
              error={fieldErrors.lastName}
              disabled={isSaving}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="familyName"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSave) {
                  void handleSave();
                }
              }}
              testID="profile-last-name-input"
            />
            <ProfileFieldRow
              label="Date Joined"
              value={formatProfileDate(dateJoined)}
            />
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel editing personal information"
                accessibilityState={{ disabled: isSaving }}
                disabled={isSaving}
                onPress={handleCancel}
                hitSlop={8}
                style={styles.cancelButton}
                testID="profile-personal-info-cancel"
              >
                <ThemedText
                  style={[
                    styles.cancelLabel,
                    {
                      color: semantic.mutedText,
                      opacity: isSaving ? 0.45 : 1,
                    },
                  ]}
                >
                  Cancel
                </ThemedText>
              </Pressable>
              <FormButton
                label="Save"
                onPress={() => {
                  void handleSave();
                }}
                disabled={!canSave}
                isLoading={isSaving}
                style={styles.saveButton}
              />
            </View>
          </View>
        ) : (
          <>
            <ProfileFieldRow label="First Name" value={firstName} />
            <ProfileFieldRow label="Last Name" value={lastName} />
            <ProfileFieldRow
              label="Date Joined"
              value={formatProfileDate(dateJoined)}
            />
          </>
        )}
      </SectionCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  heading: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  editAction: {
    fontWeight: '600',
    fontSize: 15,
  },
  editFields: {
    gap: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flexGrow: 0,
    minWidth: 112,
    paddingHorizontal: Spacing.lg,
  },
});
