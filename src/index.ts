const { createServer } = require("http");
const express = require("express");
const { PrismaClient } = require('@prisma/client')
const { execute, subscribe } = require("graphql");
const { ApolloServer, gql } = require("apollo-server-express");
const { PubSub } = require("graphql-subscriptions");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");

(async () => {
  const PORT = process.env.PORT || 4000;
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
      editing: Boolean!,
      complete: Boolean!
    }

    input TodoInput {
      id: String!,
      name: String!,
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
      setComplete(id: String, complete: Boolean): Todo
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
      addTodo: (_: any, args: { todo: TodoInput }, context: any) => {
        let addTodo = context.prisma.todo.create({ data: { id: args.todo.id, name: args.todo.name, editing: false, complete: false }});
        pubsub.publish('TODO_CHANGED', { todoChanged : { type: 'ADD', data: addTodo } });
        return addTodo;
      },
      setEditing: (_: any, args: { id: string, editing: boolean }, context: any) => {
        return context.prisma.todo.update({ where: { id: args.id }, data: { editing: args.editing }});
      },
      setComplete: (_: any, args: { id: string, complete: boolean }, context: any) => {
        return context.prisma.todo.update({ where: { id: args.id }, data: { complete: args.complete }});
      },
      updateTodo: (_: any, args : { todo: TodoInput }, context: any) => {
        let updateTodo = context.prisma.todo.update({ where: { id: args.todo.id }, data: { id: args.todo.id, name: args.todo.name, editing: false, complete: false }});
        pubsub.publish('TODO_CHANGED', { todoChanged: { type: 'UPDATE', data: updateTodo } });
        return updateTodo;
      },
      deleteTodo: (_: any, args: { id: string }) => {
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

  interface TodoInput {
    id: string,
    name: string
  }

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

  httpServer.listen(PORT, () => {});
})();

export {};