import { Resend } from "resend";
import { captureServerException } from "./analytics-server";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY!);

/**
 * Create a contact in Resend
 * New contacts are automatically subscribed to topics with default_subscription: opt_in
 */
export async function createResendContact(params: {
  email: string;
  firstName?: string;
  lastName?: string;
  userId: string;
}): Promise<{ contactId: string }> {
  try {
    const contact = await resend.contacts.create({
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
    });

    if (!contact.data?.id) {
      throw new Error("Failed to create contact in Resend");
    }

    return { contactId: contact.data.id };
  } catch (error) {
    await captureServerException(error, params.userId, {
      operation: "resend.createContact",
    });
    throw error;
  }
}

/**
 * Update contact topic subscriptions
 */
export async function updateContactTopics(params: {
  contactIdOrEmail: string;
  topics: Array<{ id: string; subscription: "opt_in" | "opt_out" }>;
}): Promise<void> {
  try {
    // Determine if we're using ID or email
    const isEmail = params.contactIdOrEmail.includes("@");
    const updateParams = isEmail
      ? { email: params.contactIdOrEmail, topics: params.topics }
      : { id: params.contactIdOrEmail, topics: params.topics };

    await resend.contacts.topics.update(updateParams);
  } catch (error) {
    await captureServerException(error, undefined, {
      operation: "resend.updateContactTopics",
      isEmail: params.contactIdOrEmail.includes("@"),
    });
    throw error;
  }
}

/**
 * Get contact's topic subscriptions from Resend
 */
export async function getContactSubscriptions(
  contactId: string,
): Promise<Array<{ topicId: string; subscribed: boolean }>> {
  try {
    // Use the dedicated topics list endpoint to get topic subscriptions
    const response = await resend.contacts.topics.list({ id: contactId });

    // Response is { data: PaginatedData<ContactTopic[]> | null, error: ... }
    // PaginatedData = { object: 'list', data: ContactTopic[], has_more: boolean }
    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error("Failed to get contact topics from Resend");
    }

    // Map topic subscriptions to our format
    // Each item has id (topic ID) and subscription ("opt_in" | "opt_out")
    const subscriptions: Array<{ topicId: string; subscribed: boolean }> =
      response.data.data.map((topic) => ({
        topicId: topic.id,
        subscribed: topic.subscription === "opt_in",
      }));

    return subscriptions;
  } catch (error) {
    await captureServerException(error, undefined, {
      operation: "resend.getContactSubscriptions",
      contactId,
    });
    throw error;
  }
}
