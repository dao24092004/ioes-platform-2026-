/**
 * Dgraph GraphQL query strings for Question Bank module.
 * Each constant is a complete GraphQL operation to be sent via DgraphClient.query().
 *
 * Note: Dgraph auto-generates query/mutation types from the deployed schema
 * (see database/schemas/dgraph/question-bank-schema.graphql).
 */

/**
 * Full-text + multi-filter search across Question nodes.
 * Filters: questionText contains `q`, difficulty/questionType exact match,
 * topic.id / language exact match, excluding soft-deleted.
 *
 * Variables:
 *   filters: object - { questionType, difficulty, topicId, language, minDifficulty, maxDifficulty, questionText }
 *   limit: number
 *   offset: number
 *
 * Note: Dgraph auto-generates QuestionFilter with all scalar fields filterable.
 */
export const SEARCH_QUESTIONS_QUERY = `
  query SearchQuestions($filters: QuestionFilter, $limit: Int!, $offset: Int!) {
    queryQuestion(filter: $filters, first: $limit, offset: $offset, order: { desc: createdAt }) {
      id
      questionText
      hint
      explanation
      questionType
      difficulty
      language
      points
      tags
      createdAt
      updatedAt
      topic {
        id
        name
        slug
      }
      requiresSkills {
        id
        name
        slug
      }
      prerequisites {
        id
      }
    }
    aggregateQuestion(filter: $filters) {
      count
    }
  }
`;

/**
 * Get a single Question node with full relations.
 */
export const GET_QUESTION_QUERY = `
  query GetQuestion($id: ID!) {
    getQuestion(id: $id) {
      id
      questionText
      hint
      explanation
      questionType
      difficulty
      language
      points
      estimatedTimeSeconds
      tags
      createdAt
      updatedAt
      topic {
        id
        name
        slug
      }
      requiresSkills {
        id
        name
        slug
      }
      prerequisites {
        id
        questionText
        difficulty
      }
      dependents {
        id
        questionText
        difficulty
      }
      options {
        id
        optionText
        isCorrect
        sortOrder
        points
        explanation
      }
      testCases {
        id
        input
        expectedOutput
        isSample
        points
      }
    }
  }
`;

/**
 * Get all root Topics (no parent).
 * Used to render the topic tree.
 *
 * Note: Dgraph doesn't support "isNull: parentTopic" filter directly via GraphQL,
 * we get all topics and filter client-side (acceptable for small topic tree, <1000 nodes).
 */
export const LIST_ROOT_TOPICS_QUERY = `
  query ListRootTopics {
    queryTopic(first: 1000, order: { asc: name }) {
      id
      name
      slug
      description
      parentTopic {
        id
      }
      subTopics {
        id
        name
        slug
        description
        parentTopic {
          id
        }
        subTopics {
          id
          name
          slug
          description
          parentTopic {
            id
          }
        }
      }
    }
  }
`;

/**
 * Practice path for a topic: returns ordered list of questions
 * following topic → sub-topics → questions with prerequisites.
 *
 * Note: `difficulty` is an enum in Dgraph, so we don't order by it
 * directly (enum sort is lexical). Service-side sort by difficulty weight.
 */
export const PRACTICE_PATH_QUERY = `
  query PracticePath($topicId: ID!) {
    getTopic(id: $topicId) {
      id
      name
      slug
      questions(first: 100) {
        id
        questionText
        difficulty
        prerequisites {
          id
          questionText
          difficulty
        }
        requiresSkills {
          name
        }
      }
      subTopics {
        id
        name
        questions(first: 100) {
          id
          questionText
          difficulty
        }
      }
    }
  }
`;

/**
 * Similar questions via semantic similarity using embedding vector
 * and structural similarity via shared topic/skills.
 *
 * Note: Dgraph GraphQL doesn't allow filtering on `id` directly.
 * We fetch `limit + 5` and filter client-side to be safe.
 */
export const SIMILAR_QUESTIONS_QUERY = `
  query SimilarQuestions($id: ID!, $limit: Int!) {
    getQuestion(id: $id) {
      similarQuestions(first: $limit) {
        id
        questionText
        difficulty
        questionType
        topic {
          name
        }
      }
      topic {
        questions(first: $limit, order: { asc: difficulty }) {
          id
          questionText
          difficulty
          questionType
        }
      }
    }
  }
`;

/**
 * Upsert a Question to Dgraph - used by Kafka consumer.
 * Note: Dgraph expects `AddQuestionInput` and uses XID for upsert behavior.
 * In production, we use Dgraph's native upsert via the `upsert` query.
 */
export const UPSERT_QUESTION_MUTATION = `
  mutation UpsertQuestion($input: AddQuestionInput!) {
    addQuestion(input: [$input]) {
      question {
        id
      }
    }
  }
`;

/**
 * Soft-delete: set deletedAt = now() instead of removing node.
 * Avoids FK/replication issues if Dgraph is out-of-sync.
 */
export const SOFT_DELETE_QUESTION_MUTATION = `
  mutation SoftDeleteQuestion($id: ID!, $now: DateTime!) {
    updateQuestion(input: { filter: { id: { eq: $id } }, set: { deletedAt: $now } }) {
      question {
        id
        deletedAt
      }
    }
  }
`;

/**
 * Hard delete (only for admin/GDPR) — use with extreme care.
 */
export const DELETE_QUESTION_MUTATION = `
  mutation DeleteQuestion($id: ID!) {
    deleteQuestion(filter: { id: { eq: $id } }) {
      msg
      numUids
    }
  }
`;
