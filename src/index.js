const { createServer } = require("http");
const express = require("express");
const { PrismaClient } = require('@prisma/client')
const { execute, subscribe } = require("graphql");
const { ApolloServer, gql } = require("apollo-server-express");
const { PubSub } = require("graphql-subscriptions");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");

(async () => {
  const PORT = 4000;
  const pubsub = new PubSub();
  const app = express();
  const httpServer = createServer(app);

  // Schema definition
  const typeDefs = gql`
    type TodoSub {
      type: String!,
      data: Todo
    }

    type Todo {
      id: String!,
      name: String!,
      info: String,
      editing: Boolean!
    }

    input TodoInput {
      id: String!,
      name: String!,
      info: String
    }

    type Subscription {
      getTodoList: [Todo]
    }

    type Query {
      getTodoList: [Todo]
    }

    type Mutation {
      addTodo(todo: TodoInput): Todo
      setEditing(id: String, editing: Boolean): Todo
      updateTodo(todo: TodoInput): Todo
      deleteTodo(id: String): Todo
    }

    type Subscription {
      todoChanged: TodoSub
    }
  `;

  // Resolver map
  const resolvers = {
    Query: {
      getTodoList: () => context.prisma.todo.findMany()
    },
    Mutation: {
      addTodo: (_, args, context) => {
        let addTodo = context.prisma.todo.create({ data: { id: args.todo.id, name: args.todo.name, info: args.todo.info, editing: false }});
        pubsub.publish('TODO_CHANGED', { todoChanged : { type: 'ADD', data: addTodo } });
        return addTodo;
      },
      setEditing: (_, args, context) => {
        return context.prisma.todo.update({ where: { id: args.id }, data: { editing: args.editing }});
      },
      updateTodo: (_, args, context) => {
        let updateTodo = context.prisma.todo.update({ where: { id: args.todo.id }, data: { id: args.todo.id, name: args.todo.name, info: args.todo.info, editing: false }});
        pubsub.publish('TODO_CHANGED', { todoChanged: { type: 'UPDATE', data: updateTodo } });
        return updateTodo;
      },
      deleteTodo: (_, args) => {
        let deleteTodo = context.prisma.todo.delete({ where: { id: args.id }});
        pubsub.publish('TODO_CHANGED', { todoChanged: { type: 'DELETE', data: deleteTodo } });
        return deleteTodo;
      }
    },
    Subscription: {
      todoChanged: {
        subscribe: () => pubsub.asyncIterator(['TODO_CHANGED'])
      }
    }
  };

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const prisma = new PrismaClient()
  const context = {
    prisma: prisma
  }

  const server = new ApolloServer({
    schema,
    context: context
  });
  await server.start();
  server.applyMiddleware({ app });

  SubscriptionServer.create(
    { schema, execute, subscribe },
    { server: httpServer, path: server.graphqlPath }
  );

  httpServer.listen(PORT, () => {
    console.log(
      `🚀 Query endpoint ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscription endpoint ready at ws://localhost:${PORT}${server.graphqlPath}`
    );
  });
})();
