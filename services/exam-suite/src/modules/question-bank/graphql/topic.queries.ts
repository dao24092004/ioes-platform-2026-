/**
 * GraphQL queries/mutations cho Topic sync sang Dgraph (ADR-012).
 */

export const UPSERT_TOPIC_MUTATION = `
  mutation UpsertTopic($input: AddTopicInput!) {
    addTopic(input: [$input], upsert: true) {
      topic {
        id
        name
        slug
        description
        level
        parentTopic {
          id
        }
      }
    }
  }
`;

export const DELETE_TOPIC_MUTATION = `
  mutation DeleteTopic($id: [ID!]!) {
    deleteTopic(filter: { id: $id }) {
      msg
      topic {
        id
      }
    }
  }
`;

export const LIST_TOPICS_QUERY = `
  query ListTopics {
    queryTopic(order: { asc: level }) {
      id
      name
      slug
      description
      level
      parentTopic {
        id
      }
      subTopics(filter: { isActive: true }) {
        id
        name
        slug
        level
      }
    }
  }
`;

export const GET_TOPIC_QUERY = `
  query GetTopic($id: ID!) {
    getTopic(id: $id) {
      id
      name
      slug
      description
      level
      parentTopic {
        id
        name
      }
      subTopics(filter: { isActive: true }) {
        id
        name
        slug
        level
      }
    }
  }
`;