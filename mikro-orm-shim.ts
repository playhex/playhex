const noopDecorator = () => () => {};

export class Collection<T>
{
    private items: T[] = [];

    add(item: T): void
    {
        this.items.push(item);
    }

    [Symbol.iterator]() {
        let index = -1;
        const data = this.items;

        return {
            next: () => ({ value: data[++index], done: !(index in data) }),
        };
    }
}

export {
    noopDecorator as OneToOne,
    noopDecorator as Property,
    noopDecorator as Entity,
    noopDecorator as PrimaryKey,
    noopDecorator as ManyToOne,
    noopDecorator as Index,
    noopDecorator as OneToMany,
    noopDecorator as ManyToMany,
    noopDecorator as Cascade,
};
